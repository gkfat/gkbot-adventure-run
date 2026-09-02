/**
 * Item/equipment icon identifiers, rendered by <GamePixelIcon> as
 * `/images/pixel-icons/<name>.png` (12x12 pixel art, one file per name).
 *
 * The pixel data itself is not in the app bundle — it's authored/regenerated
 * from `scripts/pixel-art/game-icons/build.py` (edit the grid there, rerun,
 * commit the changed PNG under public/images/pixel-icons/).
 */
export type PixelIconName =
    | 'sword' | 'helmet' | 'potion' | 'shield' | 'chest' | 'boot' | 'ring'
    | 'hat' | 'tshirt' | 'hand' | 'foot' | 'ringSlot'
    | 'wrench' | 'riotShield' | 'faceplate' | 'crateVest' | 'greaves' | 'chipRing' | 'engineOil'
    | 'techGoggles' | 'cargoBotPlate' | 'hydraulicArmGuard' | 'raiderGauntlet' | 'magnetRing' | 'magneticBoots'
    | 'terminalGloves' | 'securityHelmet' | 'isolationSuit' | 'catwalkBoots' | 'weddingRing'
    | 'confirm' | 'cancel';
