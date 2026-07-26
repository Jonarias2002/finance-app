'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input, Select, Button, Alert, AmountInput } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRate, type Currency } from '@/lib/format';
import { rateOnOrBefore, type RatePoint } from '@/features/exchange-rates/rate-history';
import { saveTransaction } from './actions';
import type { AccountOption, CategoryOption, ProductOption, TxnRow, TxnType } from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TxnRow | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
  products: ProductOption[];
  rateHistory: RatePoint[];
  defaultDate: string;
  defaultType: TxnType;
  onSaved: () => void;
};

/** "36,50" o "36.5" -> 36.5. Vacío o inválido -> null. */
function parseRate(text: string): number | null {
  const n = Number(text.replace(/\./g, '').replace(',', '.'));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

export function TransactionFormDialog(props: Props) {
  const t = useTranslations('transactions');
  const { open, onOpenChange, transaction } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? t('edit') : t('new')}</DialogTitle>
        </DialogHeader>
        <TransactionForm key={transaction?.id ?? 'new'} {...props} />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  onOpenChange,
  transaction,
  accounts,
  categories,
  products,
  rateHistory,
  defaultDate,
  defaultType,
  onSaved,
}: Props) {
  const t = useTranslations('transactions');
  const [state, action, pending] = useActionState(saveTransaction, undefined);

  const [type, setType] = useState<TxnType>(transaction?.type ?? defaultType);
  const [accountId, setAccountId] = useState<string>(
    transaction?.accountId ?? accounts[0]?.id ?? '',
  );
  const [amountText, setAmountText] = useState<string>(
    transaction ? String(transaction.amount).replace('.', ',') : '',
  );
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? '');
  const [transferId, setTransferId] = useState<string>(transaction?.transferAccountId ?? '');
  const [description, setDescription] = useState<string>(transaction?.description ?? '');
  const [productId, setProductId] = useState<string>('');

  const dateForInput = transaction
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
        new Date(transaction.occurredAt),
      )
    : defaultDate;
  const [occurredAt, setOccurredAt] = useState<string>(dateForInput);

  // Tasa manual: vacío = seguir la tasa de la fecha elegida. Al editar arranca con
  // la tasa congelada del movimiento para no alterarla sin querer (ADR 12).
  const [rateText, setRateText] = useState<string>(
    transaction && transaction.currency === 'VES'
      ? String(transaction.exchangeRate).replace('.', ',')
      : '',
  );
  const [showRate, setShowRate] = useState(false);

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const isTransfer = type === 'transfer';
  const account = accounts.find((a) => a.id === accountId);
  const currency: Currency = account?.currency ?? 'USD';

  const amount = useMemo(
    () => Number(amountText.replace(/\./g, '').replace(',', '.')) || 0,
    [amountText],
  );

  // Tasa efectiva: la manual si el usuario escribió una; si no, la del día elegido.
  const autoPoint = useMemo(
    () => rateOnOrBefore(rateHistory, occurredAt),
    [rateHistory, occurredAt],
  );
  const manualRate = parseRate(rateText);
  const effectiveRate = manualRate ?? autoPoint?.rate ?? 0;
  // Fecha que mostramos junto a la tasa: la del movimiento si es manual, o la de la
  // fila usada si seguimos el histórico (puede ser anterior si ese día no hubo tasa).
  const rateLabelDate = `${manualRate ? occurredAt : (autoPoint?.date ?? occurredAt)}T12:00:00-04:00`;

  const categoryOptions = categories.filter((c) => c.kind === type);
  // Productos vinculados a la categoría elegida (por su categoría por defecto).
  const catProducts = categoryId ? products.filter((p) => p.categoryId === categoryId) : [];
  // Destino: solo cuentas de la misma moneda que el origen, distintas del origen.
  const destOptions = accounts.filter((a) => a.currency === currency && a.id !== accountId);
  const destId = destOptions.find((a) => a.id === transferId)?.id ?? destOptions[0]?.id ?? '';

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  function onCurrencyChange(next: Currency) {
    const match = accounts.find((a) => a.currency === next);
    if (match) setAccountId(match.id);
  }

  if (accounts.length === 0) {
    return <p className="text-body text-sage py-4">{t('needAccount.description')}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="amount" value={amount} />
      {isTransfer ? (
        <input type="hidden" name="transferAccountId" value={destId} />
      ) : (
        <input type="hidden" name="categoryId" value={categoryId} />
      )}
      {/* Solo enviamos tasa cuando es manual; si va vacío, el servidor toma la del día. */}
      <input type="hidden" name="exchangeRate" value={manualRate ?? ''} />

      {/* Tipo */}
      <div role="radiogroup" aria-label={t('fields.type')} className="grid grid-cols-2 gap-2">
        {(['income', 'expense'] as const).map((v) => {
          const activeBtn = type === v;
          const activeCls =
            v === 'income'
              ? 'border-verde text-verde bg-verde/5'
              : 'border-ladrillo text-ladrillo bg-ladrillo/5';
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={activeBtn}
              onClick={() => {
                setType(v);
                setCategoryId('');
                setProductId('');
              }}
              className={cn(
                'rounded-control text-caption h-11 border font-medium transition-colors',
                activeBtn ? activeCls : 'border-line text-sage hover:text-ink',
              )}
            >
              {t(`types.${v}`)}
            </button>
          );
        })}
      </div>

      {/* 1. Monto */}
      <AmountInput
        value={amountText}
        currency={currency}
        rate={effectiveRate}
        rateDate={rateLabelDate}
        onValueChange={setAmountText}
        onCurrencyChange={onCurrencyChange}
        onEditRate={currency === 'VES' ? () => setShowRate((s) => !s) : undefined}
      />
      {err('amount') && <p className="text-caption text-ladrillo">{err('amount')}</p>}

      {/* Tasa manual (opcional). Vacío = tasa de la fecha elegida. */}
      {currency === 'VES' && showRate && (
        <Field label={t('fields.rate')} htmlFor="rate" hint={t('rateHint')}>
          <div className="flex items-center gap-2">
            <Input
              id="rate"
              inputMode="decimal"
              value={rateText}
              onChange={(e) => setRateText(e.target.value)}
              placeholder={autoPoint ? formatRate(autoPoint.rate) : ''}
            />
            {rateText.trim() && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRateText('')}>
                {t('rateAuto')}
              </Button>
            )}
          </div>
        </Field>
      )}

      {/* 2. Descripción */}
      <Field
        label={t('fields.description')}
        htmlFor="description"
        required
        error={err('description')}
      >
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isTransfer ? t('transferPlaceholder') : t('descriptionPlaceholder')}
          maxLength={120}
          required
        />
      </Field>

      {isTransfer ? (
        <>
          {/* Origen / destino (transferencias heredadas) */}
          <Field label={t('fields.from')} htmlFor="account" error={err('accountId')}>
            <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </Select>
          </Field>
          {destOptions.length === 0 ? (
            <p className="text-caption text-ocre">{t('needSecondAccount')}</p>
          ) : (
            <Field label={t('fields.to')} htmlFor="dest" error={err('transferAccountId')}>
              <Select id="dest" value={destId} onChange={(e) => setTransferId(e.target.value)}>
                {destOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </>
      ) : (
        <>
          {/* 3. Categoría (+ productos de esa categoría) */}
          <Field label={t('fields.category')} htmlFor="category">
            <Select
              id="category"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setProductId('');
              }}
            >
              <option value="">{t('noCategory')}</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {catProducts.length > 0 && (
            <Field label={t('fields.product')} htmlFor="product" hint={t('productHint')}>
              <Select
                id="product"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setDescription(p.name);
                }}
              >
                <option value="">{t('pickProduct')}</option>
                {catProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {/* 4. Cuenta */}
          <Field label={t('fields.account')} htmlFor="account" error={err('accountId')}>
            <Select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}

      {/* 5. Fecha */}
      <Field label={t('fields.date')} htmlFor="occurredAt">
        <Input
          id="occurredAt"
          name="occurredAt"
          type="date"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          required
        />
      </Field>

      {state?.error && (
        <Alert level="critical" dismissible={false}>
          {t(`errors.${state.error}`)}
        </Alert>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={
            pending ||
            amount <= 0 ||
            (isTransfer && !destId) ||
            (currency === 'VES' && effectiveRate <= 0)
          }
        >
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
