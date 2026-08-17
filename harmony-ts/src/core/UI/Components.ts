namespace WidgetKit {
  export function button(settings: {
    text: string;
    objectName: string;
    bgColor?: string;
    borderColor?: string;
    onClick?: () => void;
  }): ComponentDef<QPushButton> {
    const btn = WidgetKit.defineComponent<QPushButton>({
      type: QPushButton,
      ctorArgs: [settings.text],
      props: {
        objectName: settings.objectName,
        text: settings.text,
        styleSheet: `QPushButton { font-size: 12pt; color: #ffffff; background-color: ${settings.bgColor || '#555555'}; border: 1px solid ${settings.borderColor || '#777777'}; border-radius: 8px; padding: 6px; }`,
      },
    });

    if (settings.onClick) {
      btn.setup = (widget: QPushButton) => widget.clicked.connect(settings.onClick);
    }

    return btn;
  }
}
