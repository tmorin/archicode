package io.morin.archicode.cli;

import jakarta.enterprise.context.ApplicationScoped;
import lombok.NonNull;

@ApplicationScoped
public class CommandOutputWriter {

    public void write(@NonNull String content) {
        System.out.println(content);
    }
}
