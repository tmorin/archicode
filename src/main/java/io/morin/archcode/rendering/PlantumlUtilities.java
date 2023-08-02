package io.morin.archcode.rendering;

import io.morin.archcode.context.Item;
import java.util.Optional;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
public class PlantumlUtilities {

    public String generateTechnology(Item item) {
        val buf = new StringBuilder();
        buf.append("[");
        buf.append(item.getKind().name().toLowerCase());

        Optional
            .ofNullable(item.getElement().getQualifier())
            .filter(v -> !v.isBlank())
            .ifPresent(technology -> {
                buf.append(": ");
                buf.append(technology);
            });

        buf.append("]");
        return buf.toString();
    }
}
