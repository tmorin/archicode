package io.morin.archicode.rendering.plantuml;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.viewpoint.Item;
import io.morin.archicode.viewpoint.Link;
import io.morin.archicode.viewpoint.Viewpoint;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class PlantumlNamesTest {

    private static Item item(String id) {
        Element element = Solution.builder().id(id).build();
        return ViewpointFixtures.createItem(element);
    }

    private static Viewpoint viewOf(Set<Item> items, Set<Link> links) {
        val viewpoint = Mockito.mock(Viewpoint.class);
        Mockito.when(viewpoint.getItems()).thenReturn(items);
        Mockito.when(viewpoint.getLinks()).thenReturn(links);
        return viewpoint;
    }

    private static List<String> namesOf(String... ids) {
        val items = Arrays.stream(ids).map(PlantumlNamesTest::item).collect(Collectors.toList());
        val names = PlantumlNames.of(viewOf(Set.copyOf(items), Set.of()));
        return items.stream().map(names::of).toList();
    }

    @Test
    void anIdPlantumlReadsIsItsOwnName() {
        val ids = new String[] { "shop", "shop.report_a", "shop.1st", "_x", "shop.web.api", "café.中" };
        assertEquals(List.of(ids), namesOf(ids));
    }

    @Test
    void aHyphenBecomesAnUnderscore() {
        assertEquals(List.of("shop.report_a"), namesOf("shop.report-a"));
    }

    @Test
    void everyCharacterPlantumlDoesNotReadIsReplaced() {
        assertEquals(List.of("a_b_c_d_e_f_g"), namesOf("a-b+c d:e/f$g"));
    }

    @Test
    void aNumberThatIsNotADecimalDigitIsNotReadEither() {
        // letters and decimal digits only (`conformance.test.js` copies this rule: `[\p{L}\p{Nd}_.]`)
        assertEquals(
            List.of("shop.a_", "shop.a__2", "shop.a__3"),
            namesOf("shop.a\u00b2", "shop.a\u00bd", "shop.a\u2167")
        );
    }

    @Test
    void aNameAnotherIdHasIsNeverTaken() {
        // both ids are in the view: one name each, and the id that needed no change keeps its own
        val names = namesOf("shop.report-a", "shop.report_a");
        assertEquals("shop.report_a_2", names.get(0));
        assertEquals("shop.report_a", names.get(1));
    }

    @Test
    void twoIdsThatNeedAChangeAreToldApartInTheOrderOfTheIds() {
        val names = namesOf("a+b", "a-b", "a_b");
        assertEquals(List.of("a_b_2", "a_b_3", "a_b"), names);
    }

    @Test
    void theNamesAreTheSameWhateverTheOrderTheItemsComeIn() {
        assertEquals(namesOf("a+b", "a-b", "a_b").reversed(), namesOf("a_b", "a-b", "a+b"));
    }

    @Test
    void theItemsInsideAnotherAndTheEndsOfTheLinksAreNamedToo() {
        val inner = item("shop.web-front");
        val outer = item("shop");
        outer.getChildren().add(inner);
        val far = item("shop.web_front");
        val link = Link.builder().from(inner).to(far).build();
        val names = PlantumlNames.of(viewOf(Set.of(outer), Set.of(link)));
        // `shop.web_front` is only the end of a link, and it is the view's own name for that id
        assertEquals("shop.web_front_2", names.of(inner));
        assertEquals("shop.web_front", names.of(far));
        assertEquals("shop", names.of(outer));
    }
}
