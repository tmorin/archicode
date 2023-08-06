package io.morin.archicode;

import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import java.util.Set;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
public class ResourceFixtures {

    /**
     * sol_a.sys_aa.con_aaa -> sol_a.sys_ab.con_aba
     */
    public Application.ApplicationBuilder createInternalEgress() {
        val applicationBuilder = Application.builder();

        val rel_to_con_aba = Relationship.builder().destination("sol_a.sys_ab.con_aba").build();

        val con_aaa = Container.builder().id("con_aaa").relationships(Set.of(rel_to_con_aba)).build();
        val sys_aa = System.builder().id("sys_aa").elements(Set.of(con_aaa)).build();

        val con_aba = Container.builder().id("con_aba").build();
        val sys_ab = System.builder().id("sys_ab").elements(Set.of(con_aba)).build();

        val sol_a = Solution.builder().id("sol_a").elements(Set.of(sys_aa, sys_ab)).build();
        applicationBuilder.elements(Set.of(sol_a));

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
        val system_b = System.builder().id("system_b").elements(Set.of(container_b)).build();
        val solution_b = Solution.builder().id("solution_b").elements(Set.of(system_b)).build();

        // solution_a.system_a.container_a -> solution_b.system_b.container_b
        val relationship_from_a = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val container_a = Container.builder().id("container_a").relationships(Set.of(relationship_from_a)).build();
        val system_a = System.builder().id("system_a").elements(Set.of(container_a)).build();
        val solution_a = Solution.builder().id("solution_a").elements(Set.of(system_a)).build();

        // solution_c.system_c.container_c -> solution_a.system_a.container_a
        val relationship_to_a = Relationship.builder().destination("solution_a.system_a.container_a").build();
        val container_c = Container.builder().id("container_c").relationships(Set.of(relationship_to_a)).build();
        val system_c = System.builder().id("system_c").elements(Set.of(container_c)).build();
        val solution_c = Solution.builder().id("solution_c").elements(Set.of(system_c)).build();

        applicationBuilder.elements(Set.of(solution_a, solution_b, solution_c));

        return applicationBuilder;
    }

    /**
     * solution_c.system_c.container_c -> solution_a.system_a.container_a
     */
    public Application.ApplicationBuilder createWithIngress() {
        val applicationBuilder = Application.builder();

        val container_a = Container.builder().id("container_a").build();
        val system_a = System.builder().id("system_a").elements(Set.of(container_a)).build();
        val solution_a = Solution.builder().id("solution_a").elements(Set.of(system_a)).build();

        // solution_c.system_c.container_c -> solution_a.system_a.container_a
        val relationship_to_a = Relationship.builder().destination("solution_a.system_a.container_a").build();
        val container_c = Container.builder().id("container_c").relationships(Set.of(relationship_to_a)).build();
        val system_c = System.builder().id("system_c").elements(Set.of(container_c)).build();
        val solution_c = Solution.builder().id("solution_c").elements(Set.of(system_c)).build();

        applicationBuilder.elements(Set.of(solution_a, solution_c));

        return applicationBuilder;
    }

    /**
     * solution_a.system_a.container_a -> solution_b.system_b.container_b
     */
    public Application.ApplicationBuilder createWithEgress() {
        val applicationBuilder = Application.builder();

        val container_b = Container.builder().id("container_b").build();
        val system_b = System.builder().id("system_b").elements(Set.of(container_b)).build();
        val solution_b = Solution.builder().id("solution_b").elements(Set.of(system_b)).build();

        // solution_a.system_a.container_a -> solution_b.system_b.container_b
        val relationship_from_a = Relationship.builder().destination("solution_b.system_b.container_b").build();
        val container_a = Container.builder().id("container_a").relationships(Set.of(relationship_from_a)).build();
        val system_a = System.builder().id("system_a").elements(Set.of(container_a)).build();
        val solution_a = Solution.builder().id("solution_a").elements(Set.of(system_a)).build();

        applicationBuilder.elements(Set.of(solution_a, solution_b));

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

        val con_aaa = Container.builder().id("con_aaa").relationships(Set.of(rel_to_con_aab, rel_to_con_aba)).build();
        val con_aab = Container.builder().id("con_aab").relationships(Set.of(rel_from_con_aab)).build();
        val sys_aa = System.builder().id("sys_aa").elements(Set.of(con_aaa, con_aab)).build();

        val con_aba = Container.builder().id("con_aba").relationships(Set.of(rel_from_con_aba)).build();
        val sys_ab = System.builder().id("sys_ab").elements(Set.of(con_aba)).build();

        val sol_a = Solution.builder().id("sol_a").elements(Set.of(sys_aa, sys_ab)).build();
        applicationBuilder.elements(Set.of(sol_a));

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

        val con_aaa = Container.builder().id("con_aaa").relationships(Set.of(rel_to_con_aab, rel_to_con_aba)).build();
        val con_aab = Container.builder().id("con_aab").build();
        val sys_aa = System.builder().id("sys_aa").elements(Set.of(con_aaa, con_aab)).build();

        val con_aba = Container.builder().id("con_aba").build();
        val sys_ab = System.builder().id("sys_ab").elements(Set.of(con_aba)).build();

        val sol_a = Solution.builder().id("sol_a").elements(Set.of(sys_aa, sys_ab)).build();
        applicationBuilder.elements(Set.of(sol_a));

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
        val con_aab = Container.builder().id("con_aab").relationships(Set.of(rel_from_con_aab)).build();
        val sys_aa = System.builder().id("sys_aa").elements(Set.of(con_aaa, con_aab)).build();

        val con_aba = Container.builder().id("con_aba").relationships(Set.of(rel_from_con_aba)).build();
        val sys_ab = System.builder().id("sys_ab").elements(Set.of(con_aba)).build();

        val sol_a = Solution.builder().id("sol_a").elements(Set.of(sys_aa, sys_ab)).build();
        applicationBuilder.elements(Set.of(sol_a));

        return applicationBuilder;
    }

    /**
     * per_a -> sol_a.sys_aa
     * <p>
     * per_b -> sol_a.sys_aa
     */
    public Application.ApplicationBuilder createWithTwoIngressFromPersons() {
        val applicationBuilder = Application.builder();

        val rel_from_per_a = Relationship.builder().destination("sol_a.sys_aa").build();
        val rel_from_per_b = Relationship.builder().destination("sol_a.sys_aa").build();

        val per_a = System.builder().id("per_a").relationships(Set.of(rel_from_per_a)).build();

        val per_b = System.builder().id("per_b").relationships(Set.of(rel_from_per_b)).build();

        val sys_aa = System.builder().id("sys_aa").build();
        val sol_a = Solution.builder().id("sol_a").elements(Set.of(sys_aa)).build();

        applicationBuilder.elements(Set.of(per_a, per_b, sol_a));

        return applicationBuilder;
    }
}
