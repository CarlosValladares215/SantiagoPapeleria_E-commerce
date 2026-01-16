async function run() {
    try {
        const response = await fetch('http://localhost:4000/matrix/ports/acme/af58yz?CMD=STO_MTX_CAT_PRO');
        const products = await response.json();

        if (!Array.isArray(products)) {
            console.error('API response is not an array:', products);
            return;
        }

        // Find MAGICOLOR
        const magicolor = products.find(p => p.COD === '002290');
        if (magicolor) {
            console.log('--- MAGICOLOR PRODUCT ---');
            console.log(`COD: ${magicolor.COD}`);
            console.log(`NOM: ${magicolor.NOM}`);
            console.log(`G2: ${magicolor.G2}`);
            console.log(`G3: ${magicolor.G3}`);
        } else {
            console.log('MAGICOLOR (002290) not found in API response.');
        }

        // Check if ANY has G3: COLORES
        const hasColores = products.filter(p => p.G3 === 'COLORES');
        console.log(`\nFound ${hasColores.length} products with G3: COLORES`);
        if (hasColores.length > 0) {
            console.log('Example:', hasColores[0].NOM);
        }

    } catch (err) {
        console.error(err.message);
    }
}

run();
