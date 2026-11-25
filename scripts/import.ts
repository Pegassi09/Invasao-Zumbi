import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseFile } from '../lib/importer';
import { previewImport, confirmImport } from '../lib/import-service';
import { client } from '../lib/db';
async function main() {
  const [mode, arg, choice] = process.argv.slice(2);
  const policy = choice === 'substituir' || choice === 'acrescentar' ? choice : undefined;
  if (mode === '--confirmar' && arg) {
    console.log(await confirmImport(arg, 'CLI', policy));
    return;
  }
  if (!mode || mode.startsWith('-'))
    throw Error('Informe a planilha para prévia ou --confirmar ID.');
  const rows = await parseFile(await readFile(mode), basename(mode));
  console.log(JSON.stringify(await previewImport(rows, basename(mode), 'CLI'), null, 2));
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await (await client()).close();
  });
