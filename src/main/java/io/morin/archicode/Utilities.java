package io.morin.archicode;

import java.util.concurrent.Callable;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

@UtilityClass
public class Utilities {

    @SneakyThrows
    public static <V> V call(Callable<V> callable) {
        return callable.call();
    }
}
