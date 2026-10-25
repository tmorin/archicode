package io.morin.archicode.cli;

import io.morin.archicode.rendering.gap.GapFormat;
import picocli.CommandLine;

public class GapFormatConverter implements CommandLine.ITypeConverter<GapFormat> {

    @Override
    public GapFormat convert(String value) {
        try {
            return GapFormat.of(value);
        } catch (IllegalArgumentException e) {
            var failure = new CommandLine.TypeConversionException(
                "expected one of text, markdown or json but was '" + value + "'"
            );
            failure.initCause(e);
            throw failure;
        }
    }
}
