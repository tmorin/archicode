package io.morin.archicode.manifest;

import com.fasterxml.jackson.core.ObjectCodec;
import com.fasterxml.jackson.core.io.IOContext;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLParser;
import java.io.CharArrayReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;

/**
 * The YAML factory of ArchiCode: its parsers read an alias as the node it points at (see {@link AliasExpandingYamlParser}).
 */
public class AliasExpandingYamlFactory extends YAMLFactory {

    public AliasExpandingYamlFactory() {
        super();
    }

    private AliasExpandingYamlFactory(AliasExpandingYamlFactory source, ObjectCodec codec) {
        super(source, codec);
    }

    @Override
    public YAMLFactory copy() {
        return new AliasExpandingYamlFactory(this, null);
    }

    @Override
    protected Object readResolve() {
        return new AliasExpandingYamlFactory(this, _objectCodec);
    }

    @Override
    protected YAMLParser _createParser(InputStream in, IOContext context) throws IOException {
        return parser(context, _createReader(in, null, context));
    }

    @Override
    protected YAMLParser _createParser(Reader reader, IOContext context) {
        return parser(context, reader);
    }

    @Override
    protected YAMLParser _createParser(char[] data, int offset, int length, IOContext context, boolean recyclable) {
        return parser(context, new CharArrayReader(data, offset, length));
    }

    @Override
    protected YAMLParser _createParser(byte[] data, int offset, int length, IOContext context) throws IOException {
        return parser(context, _createReader(data, offset, length, null, context));
    }

    private YAMLParser parser(IOContext context, Reader reader) {
        return new AliasExpandingYamlParser(
            context,
            _parserFeatures,
            _yamlParserFeatures,
            _loaderOptions,
            _objectCodec,
            reader
        );
    }
}
