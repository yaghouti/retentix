import { loadPolicy } from '../../policy/validate.ts';

export async function validateCmd(args: string[]) {
  const [file] = args;
  if (!file) throw new Error('Policy file required');

  loadPolicy(file);

  console.log('✓ Policy is valid');
}
