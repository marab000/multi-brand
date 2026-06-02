const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const files=process.argv.slice(2);
if(!files.length){
  console.error('Укажи файлы: node scripts/copy-files-for-chat.js src/routes/+page.svelte');
  process.exit(1);
}
const extToLang={'.svelte':'svelte','.ts':'ts','.js':'js','.scss':'scss','.css':'css','.html':'html','.json':'json','.md':'md'};
const blocks=files.map((file)=>{
  const full=path.resolve(process.cwd(),file);
  if(!fs.existsSync(full)) return `${file}\nФАЙЛ НЕ НАЙДЕН`;
  const ext=path.extname(file);
  const lang=extToLang[ext]||'txt';
  const content=fs.readFileSync(full,'utf8');
  return `${file}\n\`\`\`${lang}\n${content}\n\`\`\``;
}).join('\n\n');
const res=spawnSync('pbcopy',{input:blocks});
if(res.error){
  console.log(blocks);
  process.exit(0);
}
console.log(`Скопировано файлов: ${files.length}`);