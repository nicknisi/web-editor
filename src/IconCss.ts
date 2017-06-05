import { v } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { IconJson, IconResolver } from './support/icons';

export interface IconCssProperties extends WidgetProperties {
	baseClass: string;
	icons?: IconJson;
	sourcePath?: string;
}

function getStylesFromJson(sourcePath: string, baseClass: string, icons: IconJson): string {

	const resolver = new IconResolver(sourcePath, icons);
	let styles = '';

	function before(selector: string): string {
		return selector + '::before';
	}

	function toSelector(...classes: string[]): string {
		return '.' + classes.join('.');
	}

	function iconStyle(selector: string, iconUrl: string): string {
		return `${before(selector)} { content: ' '; background-image: url('${iconUrl}'); }\n`;
	}

	for (const key in icons.iconDefinitions) {
		styles += iconStyle(toSelector(baseClass, key), resolver.iconUrl(key));
	}

	return styles;
}

export default class IconCss extends WidgetBase<IconCssProperties> {
	render() {
		return v('style', {
			media: 'screen',
			type: 'text/css'
		}, [
			this.properties.icons && this.properties.sourcePath && getStylesFromJson(this.properties.sourcePath, this.properties.baseClass, this.properties.icons) || null
		]);
	}
}
