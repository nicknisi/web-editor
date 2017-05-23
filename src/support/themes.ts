import request from '@dojo/core/request';

export interface ThemeJson {
	name: string;
	type: string;
	colors: { [color: string]: string };
	rules: monaco.editor.IThemeRule[];
}

async function loadThemeFile(filename: string): Promise<ThemeJson> {
	return (await request(filename)).json<ThemeJson>();
}

function getEditorTheme(theme: ThemeJson): monaco.editor.ITheme {
	const base = theme.type === 'dark' ? 'vs-dark' : theme.type === 'hc' ? 'hc-black' : 'vs';
	return {
		base,
		inherit: true,
		rules: theme.rules
	};
}

export async function load(filename: string): Promise<string> {
	const theme = await loadThemeFile(filename);
	monaco.editor.defineTheme(theme.name, getEditorTheme(theme));
	return theme.name;
}
