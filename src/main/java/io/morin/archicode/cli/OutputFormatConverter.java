package io.morin.archicode.cli;

import picocli.CommandLine;

public class OutputFormatConverter implements CommandLine.ITypeConverter<OutputFormat> {

    @Override
    public OutputFormat convert(String value) {
        return OutputFormat.valueOf(value.toUpperCase());
    }
}
