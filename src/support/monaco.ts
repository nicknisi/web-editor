import request from '@dojo/core/request';
import Projector from '@dojo/widget-core/mixins/Projector';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import MonacoScript from './MonacoScript';

export interface ThemeJson {
	name: string;
	type: string;
	colors: { [color: string]: string };
	rules: monaco.editor.ITokenThemeRule[];
}

async function loadThemeFile(filename: string): Promise<ThemeJson> {
	return (await request(filename)).json<ThemeJson>();
}

function getEditorTheme(theme: ThemeJson): monaco.editor.IStandaloneThemeData {
	const base = theme.type === 'dark' ? 'vs-dark' : theme.type === 'hc' ? 'hc-black' : 'vs';
	const { colors, rules } = theme;
	return {
		base,
		inherit: true,
		rules,
		colors
	};
}

let projector: Projector<WidgetProperties> & MonacoScript;

export function loadMonaco(): Promise<typeof monaco> {
	if (!projector) {
		projector = new (Projector(MonacoScript));
		projector.append();
	}

	return projector.promise;
}

export async function loadTheme(filename: string): Promise<void> {
	const theme = await loadThemeFile(filename);
	const themeName = theme.name;
	const monacoNamespace = await loadMonaco();
	monacoNamespace.editor.defineTheme(themeName, getEditorTheme(theme));
	monacoNamespace.editor.setTheme(themeName);
}
