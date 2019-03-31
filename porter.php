<?php 
    function x_replace(&$s, $re, $to){ 
        $orig = $s;
        $s = preg_replace($re, $to, $s);
        return $orig !== $s;
    }
    function stem_word($word){
        $VOWEL = '/аеиоуыэюя/';
        $PERFECTIVEGROUND = '/((ив|ивши|ившись|ыв|ывши|ывшись)|((?<=[ая])(в|вши|вшись)))$/';
        $REFLEXIVE = '/(с[яь])$/';
        $ADJECTIVE = '/(ее|ие|ые|ое|ими|ыми|ей|ий|ый|ой|ем|им|ым|ом|его|ого|еых|ую|юю|ая|яя|ою|ею)$/';
        $PARTICIPLE = '/((ивш|ывш|ующ)|((?<=[ая])(ем|нн|вш|ющ|щ)))$/';
        $VERB = '/((ила|ыла|ена|ейте|уйте|ите|или|ыли|ей|уй|ил|ыл|им|ым|ены|ить|ыть|ишь|ую|ю)|((?<=[ая])(ла|на|ете|йте|ли|й|л|ем|н|ло|но|ет|ют|ны|ть|ешь|нно)))$/';
        $NOUN = '/(а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|и|ы|ь|ию|ью|ю|ия|ья|я)$/';
        $RVRE = '/^(.*?[аеиоуыэюя])(.*)$/';
        $DERIVATIONAL = '/[^аеиоуыэюя][аеиоуыэюя]+[^аеиоуыэюя]+[аеиоуыэюя].*(?<=о)сть?$/';

        $word = mb_strtolower($word);
        $word = str_replace('ё', 'е', $word); 
        $stem = $word;
        do {
          if (!preg_match($RVRE, $word, $p)) {
              break;
          }
          $start = $p[1];
          $RV    = $p[2];
          if (!$RV){
              break;
          }
          # Step 1
          if (!x_replace($RV, $PERFECTIVEGROUND, '')) {
              x_replace($RV, $REFLEXIVE, '');
              if (x_replace($RV, $ADJECTIVE, '')) {
                    x_replace($RV, $PARTICIPLE, '');
              } else if (!x_replace($RV, $VERB, '')) {
                    x_replace($RV, $NOUN, '');
              }
          }
          # Step 2
          x_replace($RV, '/и$/', '');
          # Step 3
          if (preg_match($DERIVATIONAL,$RV)){
              x_replace($RV, '/ость?$/', '');
          }    
          # Step 4
          if (!x_replace($RV, '/ь$/', '')) {
              x_replace($RV, '/ейше?/', '');
              x_replace($RV, '/нн$/', 'н');
          }
          $stem = $start.$RV;
        } while(false);
        return $stem;
    }

