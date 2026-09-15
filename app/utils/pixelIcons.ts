/**
 * Item/equipment icon identifiers, rendered by <GameCommonPixelIcon> as
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
    | 'vrBracer' | 'vrVisor' | 'tokenRing' | 'bartenderGloves' | 'storeVest' | 'sneakers'
    | 'storeBat' | 'serumInjector'
    | 'drillArm' | 'pulseGauntlet' | 'holoShield' | 'neuralCirclet' | 'tacticalFaceguard'
    | 'fiberSuit' | 'maglevBoots' | 'dataRing'
    | 'warhammer' | 'crusaderSword' | 'kiteShield' | 'plateGauntlet' | 'tournamentHelm'
    | 'chainmailVest' | 'ridingBoots' | 'signetRing'
    | 'scrapDagger' | 'breachPike' | 'riotHalberd' | 'emPistol' | 'laserRifle' | 'pulseCrossbow'
    | 'mysteryCapsule'
    | 'confirm' | 'cancel';
