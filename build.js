const builder = require('electron-builder')
const Platform = builder.Platform

async function build() {
    await builder.build({
        targets: Platform.current().createTarget(),
        config: {
            // Override package.json config here if needed
        }
    })
    console.log('Build completed!')
}

build().catch(console.error)