import 'dotenv/config'
import { spawn } from 'child_process'
import fs from 'fs-extra'
const LOG = 'scripts/fetch-tetrasis-kits/sync.log'
const env = {
	...process.env,
	TETRASIS_KITS_DRY_RUN: 'false',
	FETCH_IMAGES_SOURCE: 'queue',
	FETCH_IMAGES_MODE: 'missing',
	FETCH_IMAGES_QUEUE: 'scripts/fetch-tetrasis-images/image-queue.json'
}
const now = () => new Date().toISOString()
async function log(...a) {
	const line = `${now()} ${a.join(' ')}`
	console.log(line)
	await fs.appendFile(LOG, line + '\n')
}
function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		log('RUN', command, args.join(' ')).catch(() => null)
		const child = spawn(command, args, { stdio: 'inherit', shell: false, env: { ...env, ...options.env } })
		child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)))
		child.on('error', reject)
	})
}
async function main() {
	await fs.writeFile(LOG, '')
	await run('node', ['scripts/fetch-tetrasis-kits/fetch.js'])
	await run('node', ['scripts/fetch-tetrasis-kits/import.js'])
	await run('node', ['scripts/fetch-tetrasis-images/fetch.js'])
	await log('DONE')
}
main().catch(async e => {
	await log('FATAL', e.stack || e.message).catch(() => null)
	process.exit(1)
})