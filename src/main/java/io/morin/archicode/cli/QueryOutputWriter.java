package io.morin.archicode.cli;

import com.jayway.jsonpath.JsonPath;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.PrintStream;
import java.io.StringWriter;
import java.util.Map;
import lombok.NonNull;
import lombok.Value;
import lombok.experimental.UtilityClass;
import lombok.val;
import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.Velocity;

@ApplicationScoped
public class QueryOutputWriter {

    @UtilityClass
    public static class TemplateUtilities {

        @Value
        public static class Data {

            String value;

            public <T> T e(String jsonPath) {
                return JsonPath.read(this.value, jsonPath);
            }
        }

        public String render(@NonNull String template, @NonNull String dataAsJson) {
            val ctx = new VelocityContext(Map.of("d", new Data(dataAsJson)));
            val writer = new StringWriter();
            Velocity.evaluate(ctx, writer, "inline", template);
            return writer.toString().trim();
        }
    }

    public void write(@NonNull String content, @NonNull PrintStream printStream) {
        printStream.println(content);
    }

    @SuppressWarnings("java:S106")
    public void write(@NonNull String content) {
        write(content, System.out);
    }
}
