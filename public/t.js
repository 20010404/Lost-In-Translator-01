//input the sentences and dst language wanted to translate
//LLT.translate(sentences,language) will return the destination language text
const LLT = require('./Translation.js')
var translated_text = LLT.translate("Hello",'kor');
console.log(translated_text);
