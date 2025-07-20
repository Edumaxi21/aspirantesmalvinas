// server.js - Servidor Inteligente (Guardián de la Información)
const WebSocket = require('ws');
const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// Esta variable guardará todo el contenido de las clases y juegos en la memoria del servidor.
let appState = {
    classes: [],
    games: []
};

console.log(`Servidor guardián iniciado en el puerto ${PORT}.`);

wss.on('connection', ws => {
    console.log("Nuevo aspirante conectado. Enviando estado actual...");

    // 1. Cuando alguien se conecta, se le envía inmediatamente todo el contenido guardado.
    ws.send(JSON.stringify({
        type: 'full_state_update',
        payload: appState
    }));

    // 2. Se manejan los mensajes que llegan del cliente.
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            let updatePayload = null; // Lo que se retransmitirá a todos

            // Se analiza el tipo de acción que realizó el usuario
            switch (data.type) {
                case 'class_add':
                    appState.classes.push(data.payload);
                    updatePayload = { type: 'class_add', payload: data.payload };
                    console.log(`Clase agregada: ${data.payload.title}`);
                    break;

                case 'class_update':
                    const classIndex = appState.classes.findIndex(c => c.docId === data.payload.docId);
                    if (classIndex !== -1) {
                        appState.classes[classIndex].content = data.payload.content;
                        updatePayload = { type: 'class_update', payload: data.payload };
                        console.log(`Clase actualizada: ${appState.classes[classIndex].title}`);
                    }
                    break;
                
                case 'class_delete':
                    appState.classes = appState.classes.filter(c => c.docId !== data.payload.docId);
                    updatePayload = { type: 'class_delete', payload: data.payload };
                    console.log(`Clase eliminada: ${data.payload.docId}`);
                    break;

                case 'game_add':
                    appState.games.push(data.payload);
                    updatePayload = { type: 'game_add', payload: data.payload };
                    console.log(`Juego agregado: ${data.payload.title}`);
                    break;
                
                case 'game_delete':
                    appState.games = appState.games.filter(g => g.docId !== data.payload.docId);
                    updatePayload = { type: 'game_delete', payload: data.payload };
                    console.log(`Juego eliminado: ${data.payload.docId}`);
                    break;
            }

            // Si hubo un cambio, se retransmite a TODOS los clientes conectados.
            if (updatePayload) {
                broadcast(JSON.stringify(updatePayload));
            }

        } catch (e) {
            console.error("Error procesando mensaje:", e);
        }
    });

    ws.on('close', () => {
        console.log("Un aspirante se ha desconectado.");
    });
});

// Función para enviar un mensaje a todos
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}
