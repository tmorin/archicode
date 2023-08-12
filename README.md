# ArchiCode

## Build

```shell
./mvnw package -Dquarkus.container-image.build=true
```

```shell
./mvnw clean package -Dquarkus.container-image.build=true
```

## Run

```shell
docker run -v "$(pwd):/wks" --rm thibaultmorin/archicode:0.1.0-SNAPSHOT --help
```

```shell
docker run -v "$(pwd):/wks" --rm thibaultmorin/archicode:0.1.0-SNAPSHOT query schemas workspace
```

```shell
docker run -v "$(pwd):/wks" --rm thibaultmorin/archicode:0.1.0-SNAPSHOT query schemas manifest
```

## Commands

```
archicode views generate [ID_A, ID_B, ...]

archicode query schemas [workspace|manifest]
```