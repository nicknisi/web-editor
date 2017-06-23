import uuid from '@dojo/core/uuid';
import { v, w } from '@dojo/widget-core/d';
import { DNode, WNode } from '@dojo/widget-core/interfaces';
import { theme, ThemeableMixin, ThemeableProperties } from '@dojo/widget-core/mixins/Themeable';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import TabButton from '@dojo/widgets/tabpane/TabButton';
import * as css from '@dojo/widgets/tabpane/styles/tabPane.m.css';

const ThemeableBase = ThemeableMixin(WidgetBase);

export const enum Align {
	bottom,
	left,
	right,
	top
}

export interface FileItem extends ThemeableProperties {
	closeable?: boolean;
	disabled?: boolean;
	key: string;
	label: DNode;
}

export interface FileBarProperties extends ThemeableProperties {
	activeIndex: number;
	alignButtons?: Align;
	files: FileItem[];

	onRequestTabChange?(file: FileItem, index: number): void;
	onRequestTabClose?(file: FileItem, index: number): void;
}

@theme(css)
export default class FileBar extends ThemeableBase<FileBarProperties> {
	private _id = uuid();
	// private _callTabFocus = false;

	private _onDownArrowPress() {
		const { alignButtons } = this.properties;

		if (alignButtons === Align.left || alignButtons === Align.right) {
			this.selectNextIndex();
		}
	}

	private _onLeftArrowPress() {
		this.selectPreviousIndex();
	}

	private _onRightArrowPress() {
		this.selectNextIndex();
	}

	private _onUpArrowPress() {
		const { alignButtons } = this.properties;

		if (alignButtons === Align.left || alignButtons === Align.right) {
			this.selectPreviousIndex();
		}
	}

	private _renderTabButtons(): WNode<TabButton>[] {
		const { files, theme } = this.properties;
		return files.map((file, i) => {
			const {
				closeable,
				disabled,
				key,
				label = null
			} = file;

			return w(TabButton, {
				// TODO: uncomment when TabButton published with https://github.com/dojo/widgets/pull/241
				// callFocus: this._callTabFocus && i === this.properties.activeIndex,
				active: i === this.properties.activeIndex,
				closeable,
				controls: `${ this._id }-tab-${i}`,
				disabled,
				id: `${ this._id }-tabbutton-${i}`,
				index: i,
				key,
				onClick: this.selectIndex,
				onCloseClick: this.closeIndex,
				onEndPress: this.selectLastIndex,
				// onFocusCalled: () => this._callTabFocus = false,
				onHomePress: this.selectFirstIndex,
				onDownArrowPress: this._onDownArrowPress,
				onLeftArrowPress: this._onLeftArrowPress,
				onRightArrowPress: this._onRightArrowPress,
				onUpArrowPress: this._onUpArrowPress,
				theme
			}, [ label ]);
		});
	}

	private _validateIndex(currentIndex: number, backwards?: boolean) {
		const files = this.properties.files;

		if (files.every((file) => Boolean(file.disabled))) {
			return null;
		}

		function nextIndex(index: number) {
			if (backwards) {
				return (files.length + (index - 1)) % files.length;
			}
			return (index + 1) % files.length;
		}

		let i = !files[currentIndex] ? files.length - 1 : currentIndex;

		while (files[i].disabled) {
			i = nextIndex(i);
		}

		return i;
	}

	protected closeIndex(index: number) {
		const { onRequestTabClose } = this.properties;
		const file = this.properties.files[index];

		onRequestTabClose && onRequestTabClose(file, index);
	}

	protected selectFirstIndex() {
		this.selectIndex(0, true);
	}

	protected selectIndex(index: number, backwards?: boolean) {
		const {
			activeIndex,
			onRequestTabChange
		} = this.properties;

		const validIndex = this._validateIndex(index, backwards);

		if (validIndex !== null && validIndex !== activeIndex) {
			const file = this.properties.files[validIndex];
			onRequestTabChange && onRequestTabChange(file, validIndex);
		}
	}

	protected selectLastIndex() {
		this.selectIndex(this.properties.files.length - 1);
	}

	protected selectNextIndex() {
		const { activeIndex } = this.properties;

		this.selectIndex(activeIndex === this.properties.files.length - 1 ? 0 : activeIndex + 1);
	}

	protected selectPreviousIndex() {
		const { activeIndex } = this.properties;

		this.selectIndex(activeIndex === 0 ? this.properties.files.length - 1 : activeIndex - 1, true);
	}

	render() {
		const { activeIndex } = this.properties;
		const validIndex = activeIndex;

		if (validIndex !== null && validIndex !== activeIndex) {
			this.selectIndex(validIndex);
			return null;
		}

		const children = [
			v('div', {
				key: 'buttons',
				classes: this.classes(css.tabButtons)
			}, this._renderTabButtons())
		];

		let alignClass;
		let orientation = 'horizontal';

		switch (this.properties.alignButtons) {
			case Align.right:
				alignClass = css.alignRight;
				orientation = 'vertical';
				children.reverse();
				break;
			case Align.bottom:
				alignClass = css.alignBottom;
				children.reverse();
				break;
			case Align.left:
				alignClass = css.alignLeft;
				orientation = 'vertical';
				break;
		}

		return v('div', {
			'aria-orientation': orientation,
			classes: this.classes(
				css.root,
				alignClass ? alignClass : null
			),
			role: 'tablist'
		}, children);
	}
}
