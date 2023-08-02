package io.morin.archcode;

public class ArchcodeException extends RuntimeException {

    public ArchcodeException(String message, Object... args) {
        super(String.format(message, args));
    }
}
