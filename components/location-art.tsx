import Image from 'next/image'

const art: Record<string,string> = {library:'library',fortress:'fortress',brothel:'brothel',tavern:'tavern',church:'church',market:'market'}
export function LocationArt({id, name, className = ''}:{id:string;name:string;className?:string}) {
 const image = art[id]
 if (!image) return <span className={className} aria-label={name}>🏠</span>
 return <Image src={`/location-icons/${image}.webp`} alt={name} width={96} height={96} className={`bw-location-art ${className}`} unoptimized />
}
