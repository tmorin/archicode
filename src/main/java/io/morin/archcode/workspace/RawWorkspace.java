package io.morin.archcode.workspace;

import io.morin.archcode.model.Model;
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

    @Singular
    Set<Model> models;

    @Singular
    Set<View> views;
}
