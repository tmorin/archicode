package io.morin.archcode.workspace;

import io.morin.archcode.element.application.Application;
import io.morin.archcode.view.View;
import java.util.Set;
import lombok.Builder;
import lombok.Singular;
import lombok.Value;
import lombok.extern.jackson.Jacksonized;

@Value
@Builder
@Jacksonized
public class RawWorkspace {

    @Builder.Default
    Application application = Application.builder().build();

    @Singular
    Set<View> views;

    @Builder.Default
    Settings settings = Settings.builder().build();

    @Builder.Default
    Styles styles = Styles.builder().build();
}
