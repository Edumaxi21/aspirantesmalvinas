// server.js - Servidor Inteligente con Memoria Permanente
const WebSocket = require('ws');
const fs = require('fs'); // Módulo para manejar archivos (File System)
const path = require('path'); // Módulo para manejar rutas de archivos

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

// Render nos da una carpeta persistente en './data'
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Estado inicial de la aplicación (si no hay nada guardado)
const initialState = {
    classes: [],
    games: []
};

let appState;

// --- Funciones para leer y escribir en el archivo ---

// Función para leer el estado desde el archivo JSON
function loadState() {
    try {
        // Asegurarse de que el directorio '/data' exista
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        // Si el archivo de la base de datos existe, lo leemos
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            appState = JSON.parse(data);
            console.log("Estado cargado exitosamente desde db.json.");
        } else {
            // Si no existe, usamos el estado inicial y creamos el archivo
            appState = initialState;
            fs.writeFileSync(DB_PATH, JSON.stringify(appState, null, 2), 'utf8');
            console.log("No se encontró db.json. Se creó uno nuevo con el estado inicial.");
        }
    } catch (error) {
        console.error("Error al cargar o crear el estado. Usando estado inicial.", error);
        appState = initialState;
    }
}

// Función para guardar el estado actual en el archivo JSON
function saveState() {
    try {
        // Escribimos el estado actual en el archivo de forma bonita (null, 2)
        fs.writeFileSync(DB_PATH, JSON.stringify(appState, null, 2), 'utf8');
        console.log("Estado guardado en db.json.");
    } catch (error) {
        console.error("¡Error Crítico! No se pudo guardar el estado.", error);
    }
}

// --- Lógica del Servidor WebSocket ---

// Cargamos el estado guardado al iniciar el servidor
loadState();

wss.on('connection', ws => {
    console.log("Nuevo aspirante conectado. Enviando estado actual...");

    // 1. Al conectarse, se envía el estado actual que tenemos en memoria.
    ws.send(JSON.stringify({
        type: 'full_state_update',
        payload: appState
    }));

    // 2. Manejamos los mensajes que llegan de los usuarios.
    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            let stateChanged = false; // Bandera para saber si debemos guardar

            switch (data.type) {
                case 'class_add':
                    appState.classes.push(data.payload);
                    stateChanged = true;
                    console.log(`Clase agregada: ${data.payload.title}`);
                    break;

                case 'class_update':
                    const classIndex = appState.classes.findIndex(c => c.docId === data.payload.docId);
                    if (classIndex !== -1) {
                        appState.classes[classIndex].content = data.payload.content;
                        stateChanged = true;
                        console.log(`Clase actualizada: ${appState.classes[classIndex].title}`);
                    }
                    break;
                
                case 'class_delete':
                    appState.classes = appState.classes.filter(c => c.docId !== data.payload.docId);
                    stateChanged = true;
                    console.log(`Clase eliminada: ${data.payload.docId}`);
                    break;

                case 'game_add':
                    appState.games.push(data.payload);
                    stateChanged = true;
                    console.log(`Juego agregado: ${data.payload.title}`);
                    break;
                
                case 'game_delete':
                    appState.games = appState.games.filter(g => g.docId !== data.payload.docId);
                    stateChanged = true;
                    console.log(`Juego eliminado: ${data.payload.docId}`);
                    break;
            }

            // Si hubo un cambio, lo retransmitimos a TODOS y lo guardamos en el archivo.
            if (stateChanged) {
                broadcast(JSON.stringify(data)); // Enviamos solo la actualización a los demás
                saveState(); // Guardamos el estado completo en el archivo
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
