const FLAG_COLORS = ["yellow", "green", "blue", "red"];

export function FlagIcon({ colorIndex, width, height, style }) {
    return (
        <svg viewBox="0 0 256 256" width={width} height={height} style={style}>
            <path d="M240,104,56,168V40Z" fill={FLAG_COLORS[colorIndex]} />
            <path
                d="M242.63,96.44l-184-64A8,8,0,0,0,48,40V244a8,8,0,0,0,16,0V173.69l178.63-62.13a8,8,0,0,0,0-15.12ZM64,156.75V51.25L215.65,104Z"
                fill="white"
            />
        </svg>
    );
}
