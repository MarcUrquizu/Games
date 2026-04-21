# Cómo evitar el error "Los archivos binarios no se admiten"

Si te sigue saliendo el error, normalmente no es por el código actual, sino porque en **remoto** siguen commits antiguos.

## Pasos

1. Trae los últimos cambios:

```bash
git fetch origin
```

2. Recoloca tu rama local en el commit limpio:

```bash
git checkout <tu-rama>
git reset --hard da5e026
```

3. Sube reemplazando historial remoto:

```bash
git push --force-with-lease origin <tu-rama>
```

4. Comprueba que el diff solo contiene texto contra tu rama objetivo (por ejemplo `origin/main`):

```bash
BASE=$(git merge-base HEAD origin/main)
git diff --numstat "$BASE..HEAD"
```

No debe aparecer ninguna fila con `-` `-` (eso indicaría binario).

También puedes usar el script incluido:

```bash
./scripts/check-no-binaries.sh origin/main
```

5. Si la plataforma valida **cada commit** (no solo el diff final), usa también:

```bash
./scripts/check-commit-binaries.sh origin/main
```

Si este comando falla, necesitas reescribir historial (reset/rebase) y luego hacer `push --force-with-lease`.
