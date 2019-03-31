'use strict';
var SerpstatMorf = (function(){
    var crcTable = false;
    var utils    = {
        //~~~ Detect JS context ~~~
        isNode: function() {//is script running in Node.js
            // if code `typeof module` throw error `undefined variable 'module'`
            // then this is not Node.js, but some bagged browser as MSIE
            try{ 
                if (typeof module !== 'undefined' && module.exports) {
                    return true;
                }
            } catch(e) {};
            return false;
        },
        endianness: function() {//find byte order of current machine
            var b = new ArrayBuffer(4);
            var a = new Uint32Array(b);
            var c = new Uint8Array(b);
            a[0] = 0xdeadbeef;
            if (c[0] == 0xef) return 'LE';
            if (c[0] == 0xde) return 'BE';
            throw new Error('unknown endianness');
        }, 
        
        //~~~CRC32 calculation~~~
        makeCRCTable: function() {
            if(crcTable === false){
                crcTable = [];
                var c;
                for(var n =0; n < 256; n++){
                    c = n;
                    for(var k =0; k < 8; k++){
                        c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
                    }
                    crcTable[n] = c;
                }
            }
            return crcTable;
        }, 
        utf8Encode: function(string) {
            var utftext = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                }
                else if((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
                else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        },
        crc32: function(str) {
            utils.makeCRCTable();
            str = utils.utf8Encode(str);  
            
            var crc = 0 ^ (-1);
            for (var i = 0; i < str.length; i++ ) {
                crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
            }
            return (crc ^ (-1)) >>> 0;
        },
        binaryIndexOf: function(arr, val) { //binary search
            var minIndex = 0;
            var maxIndex = arr.length - 1;
            var currentIndex;
            var currentElement;
         
            while (minIndex <= maxIndex) {
                currentIndex = (minIndex + maxIndex) / 2 | 0;
                currentElement = arr[currentIndex];
                if (currentElement < val) {
                    minIndex = currentIndex + 1;
                } else if (currentElement > val) {
                    maxIndex = currentIndex - 1;
                } else {
                    return currentIndex;
                }
            }
            return -1;
        },
        offsets: { //Offsets are needed so that Russian words do not have the same IDs as the English ones.
            'ru': 1000000,
            'en': 2000000
        },
        tests: { //Autotests
            'ru': [['автобусы','автобусов','автобус'],['стала','стали','стало']],
            'en': [['has','have'],['will','would']],
        },
        loadFile: function(name) { //download binary file in Browser or read it in Node.js 
            var promise = new classes.Promise();
            if(utils.isNode()){//Node.js
                var fs = require('fs');
                fs.readFile(__dirname+'/db/'+name,function(err,res){
                    if(err){
                        return promise._cb(err);
                    }
                    var len = res.length/4;
                    var arr = new Uint32Array(len);
                    for(var i=0;i<len;i++){
                        arr[i] = res.readUInt32BE(4*i)
                    }
                    promise._cb(err,arr);
                });            
            } else {//Browser
                var xhr     = new XMLHttpRequest(); 
                xhr.open("GET", 'https://utils.serpstat.com/db/'+name, true);
                xhr.responseType = "arraybuffer";
                xhr.onreadystatechange=function(){
                    if(xhr.readyState === 4){
                        if(xhr.status === 200 ||xhr.status === '200'){
                            if(xhr.response){
                                promise._cb(false,new Uint32Array(xhr.response));
                            } else {
                                promise._cb(new Error('!xhr.response'));
                            }
                        } else {
                            promise._cb(new Error('Status '+xhr.status+' '+xhr.statusText));
                        }
                    }
                };
                xhr.send();
            }
            return promise;
        },
        defineClasses: function(data) {
            var res = {};
            for(var className in data) if(data.hasOwnProperty(className)){
                res[className]=data[className].constructor;
                for(var methodName in data[className]) if(data[className].hasOwnProperty(methodName)){
                    if(methodName==='constructor'){
                        continue;
                    } else if(methodName==='static'){
                        for(var staticMethodName in data[className].static) if(data[className].static.hasOwnProperty(staticMethodName)){
                            res[className][staticMethodName] = data[className].static[staticMethodName];
                        }
                    } else {
                        res[className].prototype[methodName] = data[className][methodName];
                    }
                }
            }
            return res;
        }
    };
    var morfLibsCache = {};
    var classes = utils.defineClasses({
        Promise: {
            'constructor':function() {
                this._onSuc = [];
                this._onErr = [];
                this._was   = false;
                this._err   = undefined;
                this._res   = undefined;
            },
            _cb: function(err,res) {
                if(this._was){
                    return;
                }
                this._was = true;
                this._err = err;
                this._res = res;
                if(err){
                    for(var i=0;i<this._onErr.length;i++){
                        this._onErr[i](err);
                    } 
                    if(!this._onErr.length){
                        throw err;
                    }
                } else {
                    for(var i=0;i<this._onSuc.length;i++){
                        this._onSuc[i](res);
                    } 
                }
            },
            then: function(onSuc,onErr) {
                if(this._was){
                    if(!this._err && onSuc){
                        onSuc(this._res);
                    } else if(this._err && onErr){
                        onErr(this._err);
                    }
                } else {
                    if(onSuc){
                        this._onSuc.push(onSuc);
                    }
                    if(onErr){
                        this._onErr.push(onErr);
                    }
                }
                return this;
            },
            'catch': function(onErr) {
                this.then(false,onErr);
                return this;
            },
            'static': { 
                'all': function(arr) {
                    var res      = [];
                    var promise  = new classes.Promise();
                    var finished = 0;
                    var make    = function(i){
                        arr[i].then(function(cur){
                            res[i] = cur;
                            finished++;
                            if(finished===arr.length){
                                promise._cb(false,res);
                            }
                        },function(err){
                            promise._cb(err);
                        });
                    }
                    for(var i=0;i<arr.length;i++){
                        res[i] = undefined;
                    }
                    for(var i=0;i<arr.length;i++){
                        make(i);
                    }
                    return promise;                
                }
            }
        },
        MorfLib: {
            'constructor': function(lang,crc,ids) {
                morfLibsCache[lang] = this;
                this.lang   = lang;
                this.crc    = crc;
                this.ids    = ids;
                this.offset = utils.offsets[lang];
            },
            test: function() {
                var tests = utils.tests[this.lang];
                for(var i = 0; i<tests.length;i++){
                    var id = false;
                    for(var j = 0; j<tests[i].length;j++){
                        var word = tests[i][j];
                        var cur  = this.find(word);
                        if(id!==false && cur !== id){
                            return new Error('Test fail on word `'+word+'`');
                        }
                        id =  cur;
                    }
                }
                return false;
            },
            find: function(crc32) {
                var pos = utils.binaryIndexOf(this.crc,crc32);
                if(pos===-1){
                    return false;
                } else {
                    return this.offset + this.ids[pos];
                }
            },  
            'static': {
                init: function(lang) {
                    var promise = new classes.Promise();
                    if(morfLibsCache[lang]){
                        setTimeout(function(){
                            promise._cb(false,morfLibsCache[lang]);
                        },1)
                    } else {
                        var endianness = utils.isNode() ? 'BE' : utils.endianness();
                        classes.Promise.all([
                            utils.loadFile(lang+"_crc_"+endianness+".bin"),
                            utils.loadFile(lang+"_ids_"+endianness+".bin")
                        ]).then(function(res){
                            var lib = new classes.MorfLib(lang,res[0],res[1]);
                            promise._cb(lib.test(),lib);
                        },promise._cb);
                    }
                    return promise;
                }
            }
        },
        MultiLib: {
            'constructor': function(langs, morfs) {
                this.langs = langs;
                this.morfs = morfs;
            },
            find: function(word) {
                word      = word.toLowerCase().trim();
                word      = word.split('ё').join('е');
                var crc32 = utils.crc32(word);
                for(var i=0;i<this.morfs.length;i++){
                    var res = this.morfs[i].find(crc32);
                    if(res !== false){
                        return res;
                    }
                }
                return -1*crc32;
            },
            isSameWord: function(word1,word2) {
                return (this.find(word1) === this.find(word2));
            },
            createPhrase(str){
                return new classes.Phrase(this,phrase);
            },
            filter(what,opts){
                var field     = opts.field || false;
                var whiteList = opts.whiteList;
                var blackList = opts.blackList;
                var cache     = opts.cache || {};
                var isArr     = Array.isArray(what);
                
                if(whiteList){
                    whiteList = Array.isArray(whiteList) ? whiteList : [whiteList];
                    for(var i=0;i<whiteList.length;i++){
                        whiteList[i] = (typeof(whiteList[i]) ==='string') ? new classes.Phrase(this, whiteList[i],cache) : whiteList[i];
                    }
                }
                
                if(blackList){
                    blackList = Array.isArray(blackList) ? blackList : [blackList];
                    for(var i=0;i<blackList.length;i++){
                        blackList[i] = (typeof(blackList[i]) ==='string') ? new classes.Phrase(this, blackList[i],cache) : blackList[i];
                    }
                }
                
                var res  = isArr ? [] : {};
                for(var i in what) if(what.hasOwnProperty(i)){
                    var cur = field ? what[i][field] : what[i];
                    cur = (typeof(cur)==='string')  ? new classes.Phrase(this, cur,cache) : cur;
                    if(whiteList){
                        var was = false;
                        for(var j=0;j<whiteList.length;j++){
                            if(whiteList[j].check(cur)){
                                was = true;
                                break;
                            }
                        }
                        if(!was){
                            continue;
                        }
                    }
                    if(blackList){
                        var was = false;
                        for(var j=0;j<blackList.length;j++){
                            if(blackList[j].check(cur)){
                                was = true;
                                break;
                            }
                        }
                        if(was){
                            continue;
                        }
                    }
                    if(isArr){
                        res.push(what[i]);
                    } else {
                        res[i] = what[i];
                    }
                }
                return res;
            },
            'static': {
                init: function(langs) {
                    if(typeof(langs) === 'string'){
                        var langs = langs
                                    .split(',').join(' ')
                                    .split(';').join(' ')
                                    .split('\t').join(' ')
                                    .split('\r').join(' ')
                                    .split('\n').join(' ')
                                    .split('  ').join(' ')
                                    .split('  ').join(' ')
                                    .split('  ').join(' ')
                                    .split('  ').join(' ')
                                    .trim().split(' ');
                    }
                    var promise  = new classes.Promise();
                    var promises = [];
                    for(var i=0; i<langs.length; i++){
                        var lang = langs[i];
                        promises.push(classes.MorfLib.init(lang));
                    }
                    classes.Promise.all(promises).then(function(res) {
                        promise._cb(false,new classes.MultiLib(langs,res));
                    },promise._cb);
                    return promise;
                }
            }
        }, 
        Phrase:{
            'constructor': function(morf,str,cache){
                this.morf  = morf;
                this.str   = str;
                this.ids   = [];
                this.index = {};
                var arr    = str.split(' ');
                for(var i=0;i<arr.length;i++){
                    var word = arr[i].trim();
                    if(!word){
                        continue;
                    }
                    var id;
                    if(cache && cache[word]){
                        id = cache[word];
                    } else {
                        id = morf.find(word)+'';
                        if(cache){
                            cache[word] = id;
                        }
                    }
                    this.ids.push(id);
                    this.index[id] = true;
                }
            },
            check:function(phrase){
                if(typeof(phrase) === 'string'){
                    phrase = new classes.Phrase(this.morf,phrase);
                }
                for(var i=0;i<this.ids.length;i++){
                    var id = this.ids[i];
                    if(!phrase.index[id]){
                        return false;
                    }
                }
                return true;
            },
            toString:function(){
                return this.str;
            }
        }
    });
    classes.MultiLib.utils   = utils;
    classes.MultiLib.classes = classes;
    return classes.MultiLib;
})();




if(SerpstatMorf.utils.isNode()){
    module.exports      = SerpstatMorf;
} else {
    window.SerpstatMorf = SerpstatMorf;
}