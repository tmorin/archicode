package io.morin.archicode.workspace;

import io.morin.archicode.ArchiCodeException;
import java.io.IOException;
import java.nio.file.FileSystemException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Pattern;
import lombok.Getter;
import lombok.val;

/**
 * The workspace file cannot be had at all (wave 020, run 0147, issue #146, decision T3): it is not there (or is not a
 * file), the folder holds it under the name it had before 0.18, or the file system refuses to read it. It is a failure of
 * its own, so that nothing has to guess it from a file name found in a sentence: the command line prints its message like
 * that of any {@link ArchiCodeException} ({@code ErrorOutput} reads no text), and the editor keeps the same three cases
 * apart from a workspace file that is read and found wrong (an unknown key, a YAML that is not valid, a path that leaves the
 * folder: those stay an {@link ArchiCodeException} that says what is wrong, whatever file name the sentence holds).
 * {@code workspace-file-name-cases.json} says which cases are which, for both tools.
 */
@Getter
public class WorkspaceFileException extends ArchiCodeException {

    /** Why the file could not be had. */
    public enum Reason {
        /** There is no regular file under the name asked for. */
        MISSING,
        /** There is none, and the folder holds {@code workspace.yaml}: the name it had before 0.18. */
        FORMER_NAME,
        /** There is one and it cannot be read (permission denied, an error of the file system). */
        UNREADABLE
    }

    /** What reads "(Permission denied)" at the end of the message of a {@link java.io.FileNotFoundException}. */
    private static final Pattern PARENTHESIZED_REASON = Pattern.compile("\\(([^()]+)\\)$");

    Reason reason;

    private WorkspaceFileException(Reason reason, String message) {
        super("%s", message);
        this.reason = reason;
    }

    /**
     * No regular file under the name asked for.
     *
     * @param path the workspace file asked for
     * @return the failure
     */
    public static WorkspaceFileException missing(Path path) {
        return new WorkspaceFileException(
            Reason.MISSING,
            "the workspace file `" + path + "` does not exist (`-w` names another one)"
        );
    }

    /**
     * The folder was not renamed: it holds {@code workspace.yaml} and no {@code .archicode.yaml}.
     *
     * @return the failure, whose message is {@link WorkspaceFactory#FORMER_NAME_SENTENCE}
     */
    public static WorkspaceFileException formerName() {
        return new WorkspaceFileException(Reason.FORMER_NAME, WorkspaceFactory.FORMER_NAME_SENTENCE);
    }

    /**
     * The file is there and the file system does not let it be read.
     *
     * @param path the workspace file
     * @param e    what the file system said
     * @return the failure
     */
    public static WorkspaceFileException unreadable(Path path, IOException e) {
        return new WorkspaceFileException(
            Reason.UNREADABLE,
            "the workspace file `" + path + "` cannot be read: " + reasonOf(e)
        );
    }

    /** What the file system said, without the path (which the sentence already has), in lower case: "permission denied". */
    private static String reasonOf(IOException e) {
        var reason = e instanceof FileSystemException file && file.getReason() != null ? file.getReason() : null;
        if (reason == null) {
            val message = e.getMessage();
            if (message == null) {
                return e.getClass().getSimpleName();
            }
            // a FileNotFoundException says "<path> (Permission denied)"
            val parenthesized = PARENTHESIZED_REASON.matcher(message);
            reason = parenthesized.find() ? parenthesized.group(1) : message;
        }
        return reason.isEmpty() ? reason : reason.substring(0, 1).toLowerCase(Locale.ROOT) + reason.substring(1);
    }
}
