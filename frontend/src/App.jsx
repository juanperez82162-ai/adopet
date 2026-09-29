import { BrowserRouter } from 'react-router-dom';
import { SesionProvider } from './contexto/SesionContext.jsx';
import { Rutas } from './rutas/Rutas.jsx';

function App() {
    return (
        <BrowserRouter>
            <SesionProvider>
                <Rutas />
            </SesionProvider>
        </BrowserRouter>
    );
}

export default App;
