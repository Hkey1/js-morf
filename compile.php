<?php //WARNING MUST RUN ON 64bit php version
	$lang = 'ru';
	ini_set('memory_limit','20000M');
    require('porter.php');
	set_time_limit(300);
    echo stem_word('КВАРТИРЫ').'<br />';
    echo stem_word('КВАРТИР').'<br />';
    echo stem_word('КВАРТИРА').'<br />';
    echo stem_word('КВАРТИРУ').'<br />';
    exit();
	$arr = explode("\r\n",file_get_contents("morphs_{$lang}.mrd"));
	
	$data       = Array();
	$offset     = 0;
	$blockNames = Array('ends','accents','changes','prefixes','words');
	for($i=0;$i<5;$i++){
		$start  = $offset;
		$offset = $offset+ $arr[$offset]+1;
		$end    = $offset;
		$data[$blockNames[$i]] = Array();
		for($j=$start+1;$j<$end;$j++){
			$data[$blockNames[$i]][] = $arr[$j];
		}
	}
	foreach($data['ends'] as $i=>$end){
		$arr = explode('%',$end);
		$end = Array();
		for($j=1;$j<count($arr);$j++){
			$cur   = explode('*',$arr[$j]);
			$end[] = Array(
				'end'    => $cur[0],
				'mark'   => $cur[1],
				'prefix' => isset($cur[2]) ? $cur[2] : '',
			); 
		}
		$data['ends'][$i] = $end;
	}
	echo '<h3>Step 2<h3>';
	
	foreach($data['accents'] as $i=>$accent){
		$data['accents'][$i] = explode(';',$accent);
	}
	foreach($data['prefixes'] as $i=>$prefix){
		$data['prefixes'][$i] = explode(';',$prefix);
	}
	echo '<h3>Step 3<h3>';
	$voidArray = Array('');
	foreach($data['words'] as $i=>$word){
		$word = explode(' ',$word);
		$base = $word[0];
		if($base==='#'){
			$base = '';
		}
		$data['words'][$i] = Array(
			'base'=>$base,
			'ends'=>&$data['ends'][1*$word[1]],
			'accents'=>&$data['accents'][1*$word[2]],
			'prefixes'=>&$voidArray			
		);
		if($word[5] && $word[5]!='-'){
			$data['words'][$i]['prefixes'] = &$data['prefixes'][1*$word[5]];
		}
	}
	echo '<h3>Step 4<h3>';
	//exit();
	$str_to_group = Array();
	$groups       = Array();
	
	foreach($data['words'] as $i=>$word){
		$data['words'][$i]['word_id'] = $i;
		$arr = array();   
		foreach($word['prefixes'] as $prefix){
			foreach($word['ends'] as $end){
				$arr[] = $prefix.$end['prefix'].$word['base'].$end['end'];
			}
		}
		$data['words'][$i]['strings']  = $arr;

		
		$group_id   = $i;
		$words      = Array();
		$words[$i]  = $i;
		$cur_groups = Array();
		foreach($arr as $str){
			if(isset($str_to_group[$str])){
				$cur_group  = $str_to_group[$str];
				$cur_groups[$cur_group]=$cur_group;
				if($group_id>$cur_group){
					$group_id = $cur_group;
				}
			}
		}
		if(!isset($groups[$group_id])){
			$groups[$group_id] = Array();
		}

		$data['words'][$i]['group_id'] = $group_id;
		$groups[$group_id][$i]=$i;
		
		foreach($cur_groups as $group){
			foreach($groups[$group] as $w2){
				$data['words'][$w2]['group_id'] = $group_id;
				$groups[$group_id][$w2] = $w2;
			}
		}
		foreach($arr as $str){
			$str_to_group[$str] = $group_id;
		}
	}
	echo '<h3>Step 5<h3>';
	$res = Array();
	foreach($data['words'] as $i=>$word){
		foreach($word['strings'] as $str){
			$cs = crc32(str_replace('Ё','Е',$str));
			$res[$cs]= $word['group_id'];
		}		
	}
	ksort($res);
		
	foreach(Array('N'=>'BE','V'=>'LE') as $pack=>$endianness){
		$ids  = '';
		$crcs = '';
		foreach($res as $crc=>$id){
			$ids  .= pack($pack,$id);
			$crcs .= pack($pack,$crc);
		}
		file_put_contents("{$lang}_crc_{$endianness}.bin", $crcs);
		file_put_contents("{$lang}_ids_{$endianness}.bin", $ids);
	}
    
    echo '<h3>END<h3>';