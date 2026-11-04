// Пререндер /asko пишет файл по пути маршрута (asko.html или asko/index.html),
// а витрина живёт в корне своего домена — поднимаем её в корень build-asko.
// Ассеты (_app/…) adapter-static уже кладёт в корень, трогаем только страницы.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('build-asko');
const nestedDir = path.join(root, 'asko');
const nestedFile = path.join(root, 'asko.html');

if (!existsSync(root)) {
	console.error('flatten: build-asko не найден — сначала SITE=asko vite build');
	process.exit(1);
}

if (existsSync(nestedFile)) {
	cpSync(nestedFile, path.join(root, 'index.html'));
	rmSync(nestedFile);
	console.log('flatten: asko.html → index.html');
} else if (existsSync(nestedDir)) {
	for (const name of readdirSync(nestedDir)) {
		cpSync(path.join(nestedDir, name), path.join(root, name), { recursive: true });
	}
	rmSync(nestedDir, { recursive: true, force: true });
	console.log('flatten: asko/* → /*');
} else {
	console.log('flatten: вложенный /asko не найден — пропуск');
}
