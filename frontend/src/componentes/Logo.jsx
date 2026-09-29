import { Huella } from './Huella.jsx';

export function Logo({ grande = false }) {
    return (
        <span className={grande ? 'logo logo-grande' : 'logo'}>
            <span className="logo-icono">
                <Huella tamano={grande ? 30 : 20} />
            </span>
            ADOPET
        </span>
    );
}
