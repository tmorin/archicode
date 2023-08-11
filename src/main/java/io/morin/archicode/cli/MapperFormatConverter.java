package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import picocli.CommandLine;

public class MapperFormatConverter implements CommandLine.ITypeConverter<MapperFormat> {

    @Override
    public MapperFormat convert(String value) {
        return MapperFormat.valueOf(value.toUpperCase());
    }
}
