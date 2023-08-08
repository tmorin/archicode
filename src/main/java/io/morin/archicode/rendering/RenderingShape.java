package io.morin.archicode.rendering;

import io.morin.archicode.viewpoint.Item;

public enum RenderingShape {
    DATABASE,
    RECTANGLE,
    PERSON,
    QUEUE,
    NODE;

    public static RenderingShape getDefault() {
        return RECTANGLE;
    }

    public static RenderingShape getDefault(Item item) {
        if (item.getKind() == Item.Kind.PERSON) {
            return RenderingShape.PERSON;
        }
        return getDefault();
    }
}
