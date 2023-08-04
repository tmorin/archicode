package io.morin.archcode;

import io.morin.archcode.element.application.*;
import io.morin.archcode.element.application.System;
import io.morin.archcode.view.DetailedView;
import io.morin.archcode.view.OverviewView;
import io.morin.archcode.workspace.RawWorkspace;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
public class Fixtures {

    /**
     * sol_a.sys_aa.con_aaa -> sol_a.sys_ab.con_aba
     */
    public Application.ApplicationBuilder createInternalEgress() {
        val applicationBuilder = Application.builder();

        val rel_to_con_aba = Relationship.builder().destination("sol_a.sys_ab.con_aba").build();

        val con_aaa = Container.builder().id("con_aaa").relationship(rel_to_con_aba).build();
        val sys_aa = System.builder().id("sys_aa").element(con_aaa).build();

        val con_aba = Container.builder().id("con_aba").build();
        val sys_ab = System.builder().id("sys_ab").element(con_aba).build();

        val sol_a = Solution.builder().id("sol_a").element(sys_aa).element(sys_ab).build();
        applicationBuilder.element(sol_a);

        return applicationBuilder;
    }

    /**
     * solution_c.system_c.container_c -> solution_a.system_a.container_a
     * <p>
     * solution_a.system_a.container_a -> solution_b.system_b.container_b
     */
    public Application.ApplicationBuilder createWithIngressAndEgress() {
        val applicationBuilder = Application.builder();

        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").element(container_b).build();
        val solution_b = Solution.builder().id("solution_b").element(system_b).build();
        applicationBuilder.element(solution_b);

        // solution_a.system_a.container_a -> solution_b.system_b.container_b
        val relationship_from_a = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val container_a = Container.builder().id("container_a").relationship(relationship_from_a).build();
        val system_a = System.builder().id("system_a").element(container_a).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        applicationBuilder.element(solution_a);

        // solution_c.system_c.container_c -> solution_a.system_a.container_a
        val relationship_to_a = Relationship.builder().destination("solution_a.system_a.container_a").build();
        val container_c = Container.builder().id("container_c").relationship(relationship_to_a).build();
        val system_c = System.builder().id("system_c").element(container_c).build();
        val solution_c = Solution.builder().id("solution_c").element(system_c).build();
        applicationBuilder.element(solution_c);

        return applicationBuilder;
    }

    /**
     * solution_c.system_c.container_c -> solution_a.system_a.container_a
     */
    public Application.ApplicationBuilder createWithIngress() {
        val applicationBuilder = Application.builder();

        val container_a = Container.builder().id("container_a").build();
        val system_a = System.builder().id("system_a").element(container_a).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        applicationBuilder.element(solution_a);

        // solution_c.system_c.container_c -> solution_a.system_a.container_a
        val relationship_to_a = Relationship.builder().destination("solution_a.system_a.container_a").build();
        val container_c = Container.builder().id("container_c").relationship(relationship_to_a).build();
        val system_c = System.builder().id("system_c").element(container_c).build();
        val solution_c = Solution.builder().id("solution_c").element(system_c).build();
        applicationBuilder.element(solution_c);

        return applicationBuilder;
    }

    /**
     * solution_a.system_a.container_a -> solution_b.system_b.container_b
     */
    public Application.ApplicationBuilder createWithEgress() {
        val applicationBuilder = Application.builder();

        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").element(container_b).build();
        val solution_b = Solution.builder().id("solution_b").element(system_b).build();
        applicationBuilder.element(solution_b);

        // solution_a.system_a.container_a -> solution_b.system_b.container_b
        val relationship_from_a = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val container_a = Container.builder().id("container_a").relationship(relationship_from_a).build();
        val system_a = System.builder().id("system_a").element(container_a).build();
        val solution_a = Solution.builder().id("solution_a").element(system_a).build();
        applicationBuilder.element(solution_a);

        return applicationBuilder;
    }

    /**
     * sol_a.sys_aa.con_aaa -> sol_a.sys_aa.con_aab
     * <p>
     * sol_a.sys_aa.con_aaa -> sol_a.sys_ab.con_aba.com_abaa
     * <p>
     * sol_a.sys_aa.con_aab -> sol_a.sys_aa.con_aaa
     * <p>
     * sol_a.sys_ab.con_aba -> sol_a.sys_aa.con_aaa
     */
    public Application.ApplicationBuilder createWithInternalXgress() {
        val applicationBuilder = Application.builder();

        val rel_from_con_aab = Relationship.builder().destination("sol_a.sys_aa.con_aaa").build();
        val rel_from_con_aba = Relationship.builder().destination("sol_a.sys_aa.con_aaa").build();

        val rel_to_con_aab = Relationship.builder().destination("sol_a.sys_aa.con_aab").build();
        val rel_to_con_aba = Relationship.builder().destination("sol_a.sys_ab.con_aba").build();

        val con_aaa = Container
            .builder()
            .id("con_aaa")
            .relationship(rel_to_con_aab)
            .relationship(rel_to_con_aba)
            .build();
        val con_aab = Container.builder().id("con_aab").relationship(rel_from_con_aab).build();
        val sys_aa = System.builder().id("sys_aa").element(con_aaa).element(con_aab).build();

        val con_aba = Container.builder().id("con_aba").relationship(rel_from_con_aba).build();
        val sys_ab = System.builder().id("sys_ab").element(con_aba).build();

        val sol_a = Solution.builder().id("sol_a").element(sys_aa).element(sys_ab).build();
        applicationBuilder.element(sol_a);

        return applicationBuilder;
    }

    /**
     * sol_a.sys_aa.con_aaa -> sol_a.sys_aa.con_aab
     * <p>
     * sol_a.sys_aa.con_aaa -> sol_a.sys_ab.con_aba.com_abaa
     */
    public Application.ApplicationBuilder createWithInternalEgress() {
        val applicationBuilder = Application.builder();

        val rel_to_con_aab = Relationship.builder().destination("sol_a.sys_aa.con_aab").build();
        val rel_to_con_aba = Relationship.builder().destination("sol_a.sys_ab.con_aba").build();

        val con_aaa = Container
            .builder()
            .id("con_aaa")
            .relationship(rel_to_con_aab)
            .relationship(rel_to_con_aba)
            .build();
        val con_aab = Container.builder().id("con_aab").build();
        val sys_aa = System.builder().id("sys_aa").element(con_aaa).element(con_aab).build();

        val con_aba = Container.builder().id("con_aba").build();
        val sys_ab = System.builder().id("sys_ab").element(con_aba).build();

        val sol_a = Solution.builder().id("sol_a").element(sys_aa).element(sys_ab).build();
        applicationBuilder.element(sol_a);

        return applicationBuilder;
    }

    /**
     * sol_a.sys_aa.con_aab -> sol_a.sys_aa.con_aaa
     * <p>
     * sol_a.sys_ab.con_aba -> sol_a.sys_aa.con_aaa
     */
    public Application.ApplicationBuilder createWithInternalIngress() {
        val applicationBuilder = Application.builder();

        val rel_from_con_aab = Relationship.builder().destination("sol_a.sys_aa.con_aaa").build();
        val rel_from_con_aba = Relationship.builder().destination("sol_a.sys_aa.con_aaa").build();

        val con_aaa = Container.builder().id("con_aaa").build();
        val con_aab = Container.builder().id("con_aab").relationship(rel_from_con_aab).build();
        val sys_aa = System.builder().id("sys_aa").element(con_aaa).element(con_aab).build();

        val con_aba = Container.builder().id("con_aba").relationship(rel_from_con_aba).build();
        val sys_ab = System.builder().id("sys_ab").element(con_aba).build();

        val sol_a = Solution.builder().id("sol_a").element(sys_aa).element(sys_ab).build();
        applicationBuilder.element(sol_a);

        return applicationBuilder;
    }

    public static final System system_a_a = System
        .builder()
        .id("system_a_a")
        .name("System#A_A")
        .relationship(Relationship.builder().destination("solution_b").label("uses").build())
        .relationship(Relationship.builder().destination("solution_c").label("uses").build())
        .build();
    public static final System system_a_b = System
        .builder()
        .id("system_a_b")
        .name("System#A_B")
        .relationship(Relationship.builder().destination("solution_b").label("uses").build())
        .build();
    public static final Solution solution_a = Solution
        .builder()
        .id("solution_a")
        .name("Solution#A")
        .element(system_a_a)
        .element(system_a_b)
        .relationship(Relationship.builder().destination("solution_b").label("uses").build())
        .build();
    public static final Solution solution_b = Solution
        .builder()
        .id("solution_b")
        .name("Solution#B")
        .description("label of Solution#B")
        .build();
    public static final Solution solution_c = Solution
        .builder()
        .id("solution_c")
        .name("Solution#C")
        .description("label of Solution#C")
        .build();
    public static final OverviewView view_solution_a_overview = OverviewView
        .builder()
        .viewId("view_solution_a_overview")
        .element("solution_a")
        .build();
    public static final DetailedView view_solution_a_detailed = DetailedView
        .builder()
        .viewId("view_solution_a_detailed")
        .element("solution_a")
        .build();
    public static final RawWorkspace workspace_a = RawWorkspace
        .builder()
        .application(Application.builder().element(solution_a).element(solution_b).element(solution_c).build())
        .view(view_solution_a_overview)
        .view(view_solution_a_detailed)
        .build();
}
