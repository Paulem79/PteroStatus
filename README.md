# PteroStatus

Get informations of your pterodactyl/pelican panel directly on Discord

## Sécurité des clés API

Les clés (app_key / client_key) sont chiffrées en base via AES-GCM.

### Variables d'environnement
- ENC_SECRET : clé maîtresse actuelle (obligatoire pour chiffrer/déchiffrer).
- ENC_SECRET_PREVIOUS : ancienne clé (facultatif) pour rotation transparente. Les entrées chiffrées avec l'ancienne clé sont relues puis ré-encryptées avec la nouvelle.
- (Alias acceptés) APP_ENC_SECRET / PING_ENC_SECRET et *_PREVIOUS.
- LOG_MASK_DISABLE=1 : désactive le masquage des clés dans les logs.

### Format de stockage
- Ancien format: `enc:<b64(iv)>:<b64(cipher)>` (auto-migré).
- Nouveau format: `enc2:0:<b64(iv)>:<b64(cipher)>` (kid=0 pour clé primaire).

### Rotation de clé
1. Définir ENC_SECRET_PREVIOUS = ancienne clé, ENC_SECRET = nouvelle clé.
2. Redémarrer le bot: lecture -> déchiffrement avec ancienne clé -> ré-écriture chiffrée avec la nouvelle.
3. Vérifier qu'aucune valeur `enc:` legacy ne subsiste (optionnel).
4. Supprimer ENC_SECRET_PREVIOUS.

### Migration automatique
- Valeurs en clair détectées: chiffrées à la première lecture.
- Valeurs legacy `enc:`: ré-écrites en `enc2:`.

### Masquage des logs
Les motifs ressemblant à des clés (peli_*, plcn_*) sont remplacés par [SECRET] dans console.log/ warn/ error. Pour désactiver: LOG_MASK_DISABLE=1.

### Bonnes pratiques
- Ne jamais commiter config.json avec des vraies clés (utiliser variables d'env).
- Limiter les permissions des clés Pterodactyl.
- Rotation périodique (ex: trimestrielle) avec la procédure ci-dessus.
- Sauvegarder la base avant rotation.
