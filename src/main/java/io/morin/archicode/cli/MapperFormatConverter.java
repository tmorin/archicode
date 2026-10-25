package io.morin.archicode.cli;

import io.morin.archicode.MapperFormat;
import java.util.Locale;
import picocli.CommandLine;

public class MapperFormatConverter implements CommandLine.ITypeConverter<MapperFormat> {

    @Override
    public MapperFormat convert(String value) {
        return MapperFormat.valueOf(value.toUpperCase(Locale.ROOT));
    }
}
