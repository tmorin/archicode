package io.morin.archicode.manifest;

import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.core.io.IOContext;
import com.fasterxml.jackson.dataformat.yaml.YAMLParser;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.val;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.error.Mark;
import org.yaml.snakeyaml.error.MarkedYAMLException;
import org.yaml.snakeyaml.events.AliasEvent;
import org.yaml.snakeyaml.events.CollectionEndEvent;
import org.yaml.snakeyaml.events.CollectionStartEvent;
import org.yaml.snakeyaml.events.Event;
import org.yaml.snakeyaml.events.MappingStartEvent;
import org.yaml.snakeyaml.events.NodeEvent;
import org.yaml.snakeyaml.events.ScalarEvent;
import org.yaml.snakeyaml.events.SequenceStartEvent;

/**
 * A YAML parser that reads an alias as the node it points at.
 * <p>
 * Jackson's parser reports the name of an alias as the text of a string ({@code description: *n} is {@code n}). The
 * events of an anchored node are kept while they go by, and the events of the alias are replaced by a copy of them, so
 * that what the reader above sees is the document with its aliases expanded, as the editor reads it. An anchor and a tag
 * on a node change nothing else: a tag is read by the parser as it always was.
 */
class AliasExpandingYamlParser extends YAMLParser {

    /** The events of each anchored node read so far, without the anchor. */
    private final Map<String, List<Event>> anchored = new HashMap<>();

    /** The events of an alias being replayed, before the next event of the document. */
    private final Deque<Event> replay = new ArrayDeque<>();

    /** The anchored nodes whose end has not been read yet (an anchored node can hold another one). */
    private final List<Recording> recordings = new ArrayList<>();

    AliasExpandingYamlParser(
        IOContext context,
        int parserFeatures,
        int formatFeatures,
        LoaderOptions loaderOptions,
        ObjectCodec codec,
        Reader reader
    ) {
        super(context, parserFeatures, formatFeatures, loaderOptions, codec, reader);
    }

    @Override
    protected Event getEvent() throws IOException {
        while (true) {
            val event = replay.isEmpty() ? super.getEvent() : replay.pollFirst();
            if (event instanceof AliasEvent alias) {
                val events = anchored.get(alias.getAnchor());
                if (events == null) {
                    throw new UndefinedAlias(alias);
                }
                for (int i = events.size() - 1; i >= 0; i--) {
                    replay.addFirst(events.get(i));
                }
                continue;
            }
            record(event);
            return event;
        }
    }

    private void record(Event event) {
        val copy = withoutAnchor(event);
        for (val recording : recordings) {
            recording.events.add(copy);
            recording.depth += depthChange(event);
        }
        if (event instanceof NodeEvent node && node.getAnchor() != null) {
            val recording = new Recording(node.getAnchor());
            recording.events.add(copy);
            recording.depth = depthChange(event);
            recordings.add(recording);
        }
        recordings.removeIf(recording -> {
            if (recording.depth > 0) {
                return false;
            }
            anchored.put(recording.anchor, recording.events);
            return true;
        });
    }

    private static int depthChange(Event event) {
        if (event instanceof CollectionStartEvent) {
            return 1;
        }
        return event instanceof CollectionEndEvent ? -1 : 0;
    }

    private static Event withoutAnchor(Event event) {
        if (event instanceof ScalarEvent scalar && scalar.getAnchor() != null) {
            return new ScalarEvent(
                null,
                scalar.getTag(),
                scalar.getImplicit(),
                scalar.getValue(),
                scalar.getStartMark(),
                scalar.getEndMark(),
                scalar.getScalarStyle()
            );
        }
        if (event instanceof MappingStartEvent mapping && mapping.getAnchor() != null) {
            return new MappingStartEvent(
                null,
                mapping.getTag(),
                mapping.getImplicit(),
                mapping.getStartMark(),
                mapping.getEndMark(),
                mapping.getFlowStyle()
            );
        }
        if (event instanceof SequenceStartEvent sequence && sequence.getAnchor() != null) {
            return new SequenceStartEvent(
                null,
                sequence.getTag(),
                sequence.getImplicit(),
                sequence.getStartMark(),
                sequence.getEndMark(),
                sequence.getFlowStyle()
            );
        }
        return event;
    }

    private static final class Recording {

        final String anchor;
        final List<Event> events = new ArrayList<>();
        int depth;

        Recording(String anchor) {
            this.anchor = anchor;
        }
    }

    /** An alias with no anchor before it: the reader says where, as it does for any other error of the file. */
    private static final class UndefinedAlias extends MarkedYAMLException {

        UndefinedAlias(AliasEvent alias) {
            super(null, (Mark) null, "found undefined alias `" + alias.getAnchor() + "`", alias.getStartMark());
        }
    }
}
