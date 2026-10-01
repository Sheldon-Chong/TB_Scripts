include('globals.js');

/**
 * Metadata Type Discovery Test
 *
 * This script tests all four documented metadata types (string, int, double, bool)
 * by writing each as a metadata entry, reading them back, and logging the results.
 *
 * Run this in Harmony and copy the Message Log output to discover actual behavior.
 */

function testMetadataTypes() {
  MessageLog.trace('========== METADATA TYPE DISCOVERY ==========');
  MessageLog.trace('');

  // ─── 1. Clean up any previous test metadata ───
  const existing = scene.metadatas();
  MessageLog.trace('Existing metadata count before test: ' + existing.length);

  // ─── 2. Write one of each official type ───
  MessageLog.trace('');
  MessageLog.trace('--- Writing test metadata ---');

  // String type
  scene.setMetadata({
    name: 'test_string',
    type: 'string',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 'hello world',
  });
  MessageLog.trace("Wrote: test_string (type=string, value='hello world')");

  // Int type
  scene.setMetadata({
    name: 'test_int',
    type: 'int',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 42,
  });
  MessageLog.trace('Wrote: test_int (type=int, value=42)');

  // Double type
  scene.setMetadata({
    name: 'test_double',
    type: 'double',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 3.14159,
  });
  MessageLog.trace('Wrote: test_double (type=double, value=3.14159)');

  // Bool type (true)
  scene.setMetadata({
    name: 'test_bool_true',
    type: 'bool',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: true,
  });
  MessageLog.trace('Wrote: test_bool_true (type=bool, value=true)');

  // Bool type (false)
  scene.setMetadata({
    name: 'test_bool_false',
    type: 'bool',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: false,
  });
  MessageLog.trace('Wrote: test_bool_false (type=bool, value=false)');

  // ─── 3. Edge case: string that looks like a number ───
  scene.setMetadata({
    name: 'test_string_number',
    type: 'string',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: '12345',
  });
  MessageLog.trace("Wrote: test_string_number (type=string, value='12345')");

  // ─── 4. Edge case: What if we use an unsupported type? ───
  scene.setMetadata({
    name: 'test_unknown_type',
    type: 'array',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: '[1,2,3]',
  });
  MessageLog.trace("Wrote: test_unknown_type (type=array, value='[1,2,3]') — IS THIS ACCEPTED?");

  // ─── 5. Read ALL metadata back ───
  MessageLog.trace('');
  MessageLog.trace('--- Reading back all metadata ---');

  const allMeta = scene.metadatas();
  MessageLog.trace('Total metadata count: ' + allMeta.length);
  MessageLog.trace('');

  // Filter to just our test entries
  const testMeta = [];
  for (let i = 0; i < allMeta.length; i++) {
    const m = allMeta[i];
    if (m.creator === 'MetadataDiscovery') {
      testMeta.push(m);
    }
  }

  MessageLog.trace('Our test metadata count: ' + testMeta.length);
  MessageLog.trace('');

  // ─── 6. Detailed inspection of each ───
  for (let j = 0; j < testMeta.length; j++) {
    const m = testMeta[j];
    MessageLog.trace('--- Entry ' + j + ' ---');
    MessageLog.trace('  name:    ' + m.name);
    MessageLog.trace('  type:    ' + m.type);
    MessageLog.trace('  creator: ' + m.creator);
    MessageLog.trace('  version: ' + m.version);
    MessageLog.trace('  value:   ' + m.value + '  (typeof: ' + typeof m.value + ')');
    MessageLog.trace('  JSON:    ' + JSON.stringify(m));
    MessageLog.trace('');
  }

  // ─── 7. Check: does int truncate float? ───
  MessageLog.trace('--- Edge case: writing float to int type ---');
  scene.setMetadata({
    name: 'test_int_from_float',
    type: 'int',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 7.89,
  });
  const afterIntFloat = scene.metadatas();
  for (let k = 0; k < afterIntFloat.length; k++) {
    if (afterIntFloat[k].name === 'test_int_from_float') {
      MessageLog.trace('  Written: 7.89 as type=int');
      MessageLog.trace(
        '  Read back value: ' +
          afterIntFloat[k].value +
          ' (typeof: ' +
          typeof afterIntFloat[k].value +
          ')',
      );
      MessageLog.trace('  Full: ' + JSON.stringify(afterIntFloat[k]));
    }
  }

  // ─── 8. Check: what if type is omitted? ───
  MessageLog.trace('');
  MessageLog.trace('--- Edge case: no type specified (should default to string) ---');
  scene.setMetadata({
    name: 'test_no_type',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 'default_test',
  });
  const afterNoType = scene.metadatas();
  for (let l = 0; l < afterNoType.length; l++) {
    if (afterNoType[l].name === 'test_no_type') {
      MessageLog.trace("  Written with no type field, value='default_test'");
      MessageLog.trace('  Read back type: ' + afterNoType[l].type);
      MessageLog.trace(
        '  Read back value: ' +
          afterNoType[l].value +
          ' (typeof: ' +
          typeof afterNoType[l].value +
          ')',
      );
      MessageLog.trace('  Full: ' + JSON.stringify(afterNoType[l]));
    }
  }

  // ─── 9. Check: can we update an existing metadata? ───
  MessageLog.trace('');
  MessageLog.trace('--- Edge case: updating existing metadata ---');
  scene.setMetadata({
    name: 'test_string',
    type: 'string',
    creator: 'MetadataDiscovery',
    version: '1.0',
    value: 'UPDATED VALUE',
  });
  const afterUpdate = scene.metadatas();
  for (let n = 0; n < afterUpdate.length; n++) {
    if (afterUpdate[n].name === 'test_string') {
      MessageLog.trace("  Updated test_string to 'UPDATED VALUE'");
      MessageLog.trace('  Read back value: ' + afterUpdate[n].value);
      MessageLog.trace('  Full: ' + JSON.stringify(afterUpdate[n]));
    }
  }

  MessageLog.trace('');
  MessageLog.trace('========== DISCOVERY COMPLETE ==========');
}

// Run the test
try {
  testMetadataTypes();
} catch (e) {
  MessageLog.trace('ERROR: ' + e);
  if (e.stack) {
    MessageLog.trace('Stack: ' + e.stack);
  }
}
