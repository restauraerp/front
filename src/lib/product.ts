/**
 * Shared product predicates.
 *
 * `is_active` is a MySQL boolean column that the Product model does not cast,
 * so it arrives as 1 or 0 rather than true or false. Every caller comparing it
 * loosely is one `=== true` away from an empty menu, hence one predicate.
 */

/**
 * Whether a product may be sold right now.
 *
 * Deliberately fails open: only an explicit 0/false hides a product. If the
 * field ever stops being sent, a till that shows everything is recoverable and
 * a till that shows nothing is a restaurant that cannot take orders.
 */
export function isSellable(product: { is_active?: unknown }): boolean {
  const flag = product?.is_active;

  return flag !== 0 && flag !== false && flag !== '0';
}
