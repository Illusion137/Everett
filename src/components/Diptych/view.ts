import { EditorManager } from './editor-manager';
import { ResourceManager } from './utils/resource-manager';

function main() {
    const editor = new EditorManager();

    // editor.create();

    window.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.type) {
            case 'update': {
                const text = message.text;
                editor.update(text);
                return;
            }
            case 'resource-response': {
                ResourceManager.Instance.resolve(message.origin, message.result);
                return;
            }
        }
    });
}

main();
