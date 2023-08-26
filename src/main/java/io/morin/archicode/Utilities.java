package io.morin.archicode;

import java.util.concurrent.Callable;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;

@UtilityClass
public class Utilities {

    /**
     * Call a {@link Callable} and throw any exception as a {@link RuntimeException}.
     *
     * @param callable the callable to call
     * @param <V>      the return type of the callable
     * @return the result of the callable
     */
    @SneakyThrows
    public static <V> V call(Callable<V> callable) {
        return callable.call();
    }
}
