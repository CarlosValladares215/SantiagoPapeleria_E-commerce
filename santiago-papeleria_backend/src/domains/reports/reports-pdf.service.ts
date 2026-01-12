import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

@Injectable()
export class ReportsPdfService {
    async generateSalesPdf(data: any): Promise<Buffer> {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));

        // -- CONSTANTS --
        const primaryColor = '#1e3a8a'; // Blue-900
        const secondaryColor = '#64748b'; // Slate-500
        const tableHeaderColor = '#f3f4f6'; // Gray-100
        const PAID_STATUSES = ['PAGADO', 'Pagado', 'ENTREGADO', 'Entregado', 'ENVIADO', 'Enviado'];

        // 1. HEADER SECTOR
        doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);

        doc.fillColor('white').fontSize(24).font('Helvetica-Bold')
            .text('REPORTE DE VENTAS', 50, 30);

        doc.fontSize(14).font('Helvetica')
            .text('SANTIAGO PAPELERÍA', 50, 60);

        doc.fontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 400, 35, { align: 'right', width: 150 });
        doc.text(`Periodo: ${data.range === 'all' ? 'TODO EL TIEMPO' : data.range.toUpperCase()}`, 400, 50, { align: 'right', width: 150 });

        // 2. EXECUTIVE SUMMARY SECTION
        // Move cursor down after header
        doc.y = 130;

        doc.fillColor('black').font('Helvetica-Bold').fontSize(16).text('RESUMEN EJECUTIVO');

        // Draw summary box
        const boxTop = doc.y + 10;
        doc.rect(50, boxTop, 500, 80).stroke('#e5e7eb');

        const textY = boxTop + 25;

        // Column 1: Ingresos
        doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text('Total Ingresos', 70, textY);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('black').text(`$${data.ingresos.toFixed(2)}`, 70, textY + 15);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor).text('(Confirmados)', 70, textY + 35);

        // Column 2: Pedidos
        doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text('Pedidos Exitosos', 250, textY);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('black').text(data.totalPedidos.toString(), 250, textY + 15);

        // Column 3: Ticket Promedio
        doc.font('Helvetica').fontSize(10).fillColor(secondaryColor).text('Ticket Promedio', 400, textY);
        doc.font('Helvetica-Bold').fontSize(18).fillColor('black').text(`$${data.ticketPromedio.toFixed(2)}`, 400, textY + 15);

        // 3. RECENT ORDERS TABLE
        doc.moveDown(7); // Space after box
        doc.fillColor('black').font('Helvetica-Bold').fontSize(16).text('DETALLE DE MOVIMIENTOS RECIENTES');
        doc.fontSize(10).font('Helvetica').fillColor(secondaryColor).text('(Últimos 50 registros)', { continued: false });
        doc.moveDown(0.5);

        const tableTop = doc.y + 10;
        const colX = { id: 50, date: 110, client: 210, status: 350, total: 480 };

        // Table Header Bar
        doc.rect(50, tableTop, 500, 25).fill(tableHeaderColor);
        doc.fillColor('black').font('Helvetica-Bold').fontSize(9);
        const headerY = tableTop + 8;
        doc.text('ID', colX.id + 5, headerY);
        doc.text('FECHA', colX.date, headerY);
        doc.text('CLIENTE', colX.client, headerY);
        doc.text('ESTADO', colX.status, headerY);
        doc.text('TOTAL', colX.total, headerY);

        // Table Rows
        let currentY = tableTop + 25;

        doc.font('Helvetica').fontSize(9);

        data.recentOrders.forEach((order, i) => {
            // Formatting data
            const isPaid = PAID_STATUSES.includes(order.estado_pedido);
            const totalText = `$${order.resumen_financiero.total_pagado.toFixed(2)}` + (isPaid ? '' : ' *');
            const rowColor = i % 2 === 0 ? 'white' : '#fcfcfc'; // Very subtle zebra

            // Pagination check
            if (currentY > 700) {
                doc.addPage();
                currentY = 50;
            }

            // Row Background
            doc.rect(50, currentY, 500, 25).fill(rowColor);
            doc.fillColor('#374151'); // Gray-700 text

            const rowTextY = currentY + 8;

            doc.text(`#${order.numero_pedido_web}`, colX.id + 5, rowTextY);
            doc.text(new Date(order.fecha_compra).toLocaleDateString(), colX.date, rowTextY);

            const cliente = order['usuario_id'] ? `${order['usuario_id']['nombre']} ${order['usuario_id']['apellido']}` : 'Cliente Desconocido';
            doc.text(cliente.substring(0, 22), colX.client, rowTextY);

            doc.text(order.estado_pedido, colX.status, rowTextY);

            // Bold total
            doc.font('Helvetica-Bold').text(totalText, colX.total, rowTextY);
            doc.font('Helvetica'); // Reset font

            currentY += 25;
        });

        // Footer Note
        doc.moveDown(1);
        doc.y = currentY + 10;
        doc.fontSize(8).fillColor(secondaryColor)
            .text('(*) : Órdenes pendientes, canceladas o fallidas. No se suman al total de ingresos reportado.', 50, doc.y);

        doc.end();

        return new Promise((resolve) => {
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
        });
    }
}
