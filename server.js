// server.js - Servidor de Señalización para WebRTC (Optimizado para Render)
const WebSocket = require('ws');

// Render asigna un puerto dinámicamente. Usamos process.env.PORT.
// Si no lo encuentra (para pruebas locales), usa el puerto 3000.
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

let users = {};

console.log(`Servidor de señalización iniciado en el puerto ${PORT}. ¡Listo para recibir conexiones!`);

wss.on('connection', ws => {
    const userId = 'user-' + Math.random().toString(36).substr(2, 9);
    users[userId] = ws;
    console.log(`Usuario conectado: ${userId}. Total: ${Object.keys(users).length}`);

    ws.send(JSON.stringify({ type: 'id', id: userId }));
    ws.send(JSON.stringify({ type: 'all_users', users: Object.keys(users).filter(id => id !== userId) }));

    broadcast({ type: 'user_joined', id: userId }, ws);

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'signal' && data.to && users[data.to]) {
                users[data.to].send(JSON.stringify({
                    type: 'signal',
                    from: data.from,
                    signal: data.signal
                }));
            }
        } catch (e) {
            console.error("Error procesando mensaje:", e);
        }
    });

    ws.on('close', () => {
        console.log(`Usuario desconectado: ${userId}`);
        delete users[userId];
        broadcast({ type: 'user_left', id: userId });
        console.log(`Total de usuarios restantes: ${Object.keys(users).length}`);
    });

    ws.on('error', (err) => {
        console.error(`Error en la conexión del usuario ${userId}:`, err);
    });
});

function broadcast(data, excludeWs) {
    for (const id in users) {
        const client = users[id];
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    }
}