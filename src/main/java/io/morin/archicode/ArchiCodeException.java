package io.morin.archicode;

public class ArchiCodeException extends RuntimeException {

    /**
     * Create a new {@link ArchiCodeException} with the given message.
     *
     * @param message the message of the exception
     */
    public ArchiCodeException(String message, Object... args) {
        super(String.format(message, args));
    }
}
