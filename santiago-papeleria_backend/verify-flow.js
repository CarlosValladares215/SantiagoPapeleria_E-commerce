async function testPurchaseFlow() {
    const baseUrl = 'http://127.0.0.1:3000/api';
    const searchTerm = ''; // Empty to list all, or specific keyword
    const userId = '65a000000000000000000001';

    console.log(`🔍 1. Comprobando stock inicial(buscando cualquier producto con stock)...`);
    try {
        const res = await fetch(`${baseUrl}/productos?limit=50`);
        if (!res.ok) throw new Error(`Error fetching products: ${res.statusText}`);

        const data = await res.json();
        console.log('📦 API Response Type:', Array.isArray(data) ? 'Array' : typeof data);
        if (!Array.isArray(data) && data.data) {
            console.log('📦 Data count:', data.data.length);
        } else if (Array.isArray(data)) {
            console.log('📦 Data count:', data.length);
        } else {
            console.log('📦 Data content:', JSON.stringify(data).substring(0, 100));
        }

        // Find a product with stock > 2
        const items = Array.isArray(data) ? data : (data.data || []);
        const product = items.find(p => p.stock >= 2);

        if (!product) {
            console.error('❌ No se encontró ningún producto con stock suficiente (>2) para la prueba.');
            return;
        }

        console.log('   Product Sample:', JSON.stringify(product, null, 2));
        console.log('   Product Keys:', Object.keys(product));

        console.log(`   Producto elegido: ${product.sku} (${product.name})`);
        console.log(`   Stock Inicial: ${product.stock}`);
        const initialStock = product.stock;

        console.log(`🛒 2. Creando Pedido (Compra de 2 unidades)...`);

        const orderPayload = {
            usuario_id: userId,
            estado_pedido: 'PENDIENTE',
            fecha_compra: new Date().toISOString(),
            items: [
                {
                    // producto_id removed (forbidden)
                    cantidad: 2,
                    precio_unitario_aplicado: product.price || 10,
                    subtotal: (product.price || 10) * 2,
                    impuesto_iva: 0,
                    codigo_dobranet: product.sku || product.codigo_interno, // Fallback
                    nombre: product.name || product.nombre // Fallback
                }
            ],
            resumen_financiero: {
                subtotal_sin_impuestos: (product.price || 10) * 2,
                total_impuestos: 0,
                costo_envio: 0,
                total_pagado: (product.price || 10) * 2,
                metodo_pago: 'TRANSFERENCIA'
            },
            datos_envio: {
                direccion_destino: {
                    calle: 'Calle Test 123',
                    ciudad: 'Quito',
                    provincia: 'Pichincha',
                },
                guia_tracking: 'PENDIENTE',
                courier: 'SERVIENTREGA'
            }
        };

        const createRes = await fetch(`${baseUrl}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (!createRes.ok) {
            const errorText = await createRes.text();
            // Try parsing JSON if possible
            try {
                const errJson = JSON.parse(errorText);
                console.error('❌ Validation Errors:', JSON.stringify(errJson, null, 2));
            } catch (e) {
                console.error('❌ Error Text:', errorText);
            }
            throw new Error(`Error creating order: ${createRes.status}`);
        }

        const order = await createRes.json();
        console.log(`   Pedido Creado: ${order.numero_pedido_web} (ID: ${order._id})`);

        // Wait a bit for async operations if any (though stock update is await-ed in controller, usually)
        await new Promise(r => setTimeout(r, 1000));

        console.log(`🔍 3. Verificando Stock Post-Compra...`);
        // We fetch the individual product to be sure
        // Note: The API commonly uses /productos/:id or search. 
        // Let's rely on search by SKU to get fresh data.
        const resAfter = await fetch(`${baseUrl}/productos?searchTerm=${product.sku}`);
        const dataAfter = await resAfter.json();
        const itemsAfter = Array.isArray(dataAfter) ? dataAfter : (dataAfter.data || []);
        const productAfter = itemsAfter.find(p => p.sku === product.sku);

        if (!productAfter) {
            console.error('❌ Error: El producto desapareció de la búsqueda.');
            return;
        }

        console.log(`   Stock Nuevo: ${productAfter.stock}`);

        if (productAfter.stock === initialStock - 2) {
            console.log('✅ ÉXITO: El stock se descontó correctamente.');
        } else {
            console.error(`❌ ERROR: El stock no coincide. Esperado: ${initialStock - 2}, Actual: ${productAfter.stock}`);
        }

        console.log(`📜 4. Verificando Historial de Movimientos...`);
        const historyRes = await fetch(`${baseUrl}/productos/${product.sku}/history`);
        if (historyRes.ok) {
            const history = await historyRes.json();
            const lastMove = history[0]; // Assuming sorted DESC

            console.log('   Último movimiento:', lastMove ?
                `${lastMove.tipo} | Cant: ${lastMove.cantidad} | Ref: ${lastMove.referencia}` : 'N/A');

            if (lastMove && lastMove.tipo === 'VENTA' && lastMove.cantidad === -2) {
                console.log('✅ ÉXITO: Movimiento registrado correctamente en historial.');
            } else {
                console.error('❌ ERROR: No se encontró el movimiento de VENTA esperado (o no es el primero).');
            }
        } else {
            console.error(`⚠️  Falló endpoint historial: ${historyRes.status}`);
        }

    } catch (error) {
        console.error('💥 Error Crítico:', error.message);
    }
}

testPurchaseFlow();
