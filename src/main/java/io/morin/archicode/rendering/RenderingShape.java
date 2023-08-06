package io.morin.archicode.rendering;

public enum RenderingShape {
    RECTANGLE,
    DATABASE,
    CARD,
    NODE;

    public static RenderingShape getDefault() {
        return RECTANGLE;
    }
}
