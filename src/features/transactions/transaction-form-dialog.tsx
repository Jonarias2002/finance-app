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
import { Field, Input, Select, Button, Alert, AmountInput, Segmented } from '@/components/ui';
import { amountToInput, formatMoney, formatRate, type Currency } from '@/lib/format';
import {
  DEFAULT_RATE_SOURCE,
  rateOnOrBefore,
  type RateHistories,
  type RateSource,
} from '@/features/exchange-rates/rate-history';
import { saveTransaction } from './actions';
import {
  KIND_DIRECTION,
  KIND_TYPE,
  MOVEMENT_KINDS,
  type AccountOption,
  type CategoryOption,
  type DebtMode,
  type DebtOption,
  type MovementKind,
  type ProductOption,
  type StoreOption,
  type TxnRow,
  type TxnType,
} from './schemas';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TxnRow | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
  products: ProductOption[];
  stores: StoreOption[];
  debts: DebtOption[];
  rateHistories: RateHistories;
  defaultDate: string;
  defaultType: TxnType;
  onSaved: () => void;
};

/** "36,50" o "36.5" -> 36.5. Vacío o inválido -> null. */
function parseRate(text: string): number | null {
  const n = Number(text.replace(/\./g, '').replace(',', '.'));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

/** De dónde sale la tasa del movimiento: una de las dos fuentes, o escrita a mano. */
type RateMode = RateSource | 'manual';

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
  stores,
  debts,
  rateHistories,
  defaultDate,
  defaultType,
  onSaved,
}: Props) {
  const t = useTranslations('transactions');
  const [state, action, pending] = useActionState(saveTransaction, undefined);

  // El tipo manda sobre el resto del formulario: cada uno enseña solo sus campos.
  // Al editar se reconstruye de la fila (un gasto con deuda es un pago de deuda).
  const initialKind: MovementKind = transaction?.debtId
    ? transaction.type === 'income'
      ? 'debtCollection'
      : 'debtPayment'
    : ((transaction?.type ?? defaultType) as MovementKind);
  const [kind, setKind] = useState<MovementKind>(initialKind);
  const [accountId, setAccountId] = useState<string>(
    transaction?.accountId ?? accounts[0]?.id ?? '',
  );
  // El monto se teclea en la moneda que elija el usuario, que no tiene por qué ser
  // la de la cuenta. Al editar se recupera lo que se escribió en su momento.
  const [amountText, setAmountText] = useState<string>(
    transaction ? amountToInput(transaction.entryAmount ?? transaction.amount) : '',
  );
  const [entryCurrency, setEntryCurrency] = useState<Currency>(
    transaction?.entryCurrency ?? transaction?.currency ?? accounts[0]?.currency ?? 'USD',
  );
  // Mientras no se toque el selector, la moneda sigue a la cuenta: cambiar de
  // cuenta no debe convertir a espaldas de nadie.
  const [currencyPinned, setCurrencyPinned] = useState(false);
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? '');
  const [storeId, setStoreId] = useState<string>(transaction?.storeId ?? '');
  const [description, setDescription] = useState<string>(transaction?.description ?? '');
  const [productId, setProductId] = useState<string>('');
  const [debtId, setDebtId] = useState<string>(transaction?.debtId ?? '');

  const dateForInput = transaction
    ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(
        new Date(transaction.occurredAt),
      )
    : defaultDate;
  const [occurredAt, setOccurredAt] = useState<string>(dateForInput);

  // Fuente de la tasa. Un movimiento nuevo sigue la del BCV; al editar uno en
  // bolívares arrancamos en manual con la tasa ya congelada, para no alterarla sin
  // querer al reabrir el formulario (ADR 12).
  const editingVes = Boolean(transaction && transaction.currency === 'VES');
  // La fuente y el modo manual viven aparte: así, al volver de Manual, se recupera
  // la fuente que estabas mirando en vez de saltar siempre a la de por defecto.
  const [rateSource, setRateSource] = useState<RateSource>(DEFAULT_RATE_SOURCE);
  const [isManualRate, setIsManualRate] = useState(editingVes);
  const [rateText, setRateText] = useState<string>(
    editingVes ? String(transaction!.exchangeRate).replace('.', ',') : '',
  );

  useEffect(() => {
    if (state?.ok) onSaved();
  }, [state, onSaved]);

  const type: TxnType = KIND_TYPE[kind];
  const debtDirection = KIND_DIRECTION[kind];
  // Un movimiento de deuda no lleva categoría, ni tienda, ni descripción a mano:
  // lo único que hay que decir es a qué deuda va y si la cancela.
  const isDebtKind = debtDirection !== null;
  // La tienda solo tiene sentido en un gasto (la tabla lo exige con un check).
  const isExpense = type === 'expense' && !isDebtKind;
  const account = accounts.find((a) => a.id === accountId);
  // Moneda de la cuenta: la que termina moviendo el saldo. El monto puede teclearse
  // en la otra y el servidor lo convierte con la tasa elegida.
  const accountCurrency: Currency = account?.currency ?? 'USD';
  // Hace falta tasa siempre que haya bolívares de algún lado: para convertir, o
  // para el valor canónico en USD que guarda la fila.
  const needsRate = entryCurrency === 'VES' || accountCurrency === 'VES';

  const amount = useMemo(
    () => Number(amountText.replace(/\./g, '').replace(',', '.')) || 0,
    [amountText],
  );

  // Tasa efectiva: la escrita a mano, o la de la fuente elegida en la fecha del
  // movimiento. El servidor repite este cálculo; aquí solo se previsualiza.
  const rateMode: RateMode = isManualRate ? 'manual' : rateSource;
  const sourceHistory = rateHistories[rateSource];
  const autoPoint = useMemo(
    () => rateOnOrBefore(sourceHistory, occurredAt),
    [sourceHistory, occurredAt],
  );
  const manualRate = isManualRate ? parseRate(rateText) : null;
  const effectiveRate = manualRate ?? (isManualRate ? 0 : (autoPoint?.rate ?? 0));
  // Fecha que mostramos junto a la tasa: la del movimiento si es manual, o la de la
  // fila usada si seguimos el histórico (puede ser anterior si ese día no hubo tasa).
  const rateLabelDate = `${isManualRate ? occurredAt : (autoPoint?.date ?? occurredAt)}T12:00:00-04:00`;
  const rateName = t(`rateSources.${rateMode}`);

  const categoryOptions = categories.filter((c) => c.kind === type);
  // Productos vinculados a la categoría elegida (por su categoría por defecto).
  const catProducts = categoryId ? products.filter((p) => p.categoryId === categoryId) : [];

  // Deudas del sentido que toca. Las ya saldadas solo siguen visibles si son la
  // que este mismo movimiento pagó (si no, editarlo perdería el enlace).
  const debtsFor = (direction: DebtOption['direction']) =>
    debts.filter((d) => d.direction === direction && (d.remaining > 0 || d.id === debtId));
  const debtOptions = debtDirection ? debtsFor(debtDirection) : [];
  const debt = debts.find((d) => d.id === debtId) ?? null;
  // No se guarda si un abono canceló la deuda: se deduce de que quedara saldada.
  const [debtMode, setDebtMode] = useState<DebtMode>(
    transaction?.debtId && debts.find((d) => d.id === transaction.debtId)?.isSettled
      ? 'settle'
      : 'partial',
  );

  // Pagar o cobrar una deuda solo se ofrece si hay alguna de ese sentido: un
  // desplegable vacío no ayuda a nadie.
  const kindOptions = MOVEMENT_KINDS.filter((k) => {
    const direction = KIND_DIRECTION[k];
    return direction === null || debtsFor(direction).length > 0 || k === kind;
  });

  const err = (field: string) =>
    state?.fieldErrors?.[field] ? t(`errors.${state.fieldErrors[field]}`) : undefined;

  /** Cambiar de tipo limpia lo que ya no aplica: cada uno tiene sus campos. */
  function changeKind(next: MovementKind) {
    setKind(next);
    setCategoryId('');
    setProductId('');
    setStoreId('');
    setDebtId('');
    setDebtMode('partial');
  }

  /** Cancelar la deuda completa arrastra el monto y la moneda de la deuda. */
  function applyDebt(nextId: string, mode: DebtMode) {
    setDebtId(nextId);
    setDebtMode(mode);
    const next = debts.find((d) => d.id === nextId);
    if (!next || mode !== 'settle' || next.remaining <= 0) return;
    setAmountText(amountToInput(next.remaining));
    setEntryCurrency(next.currency);
    setCurrencyPinned(true);
  }

  function onCurrencyChange(next: Currency) {
    setEntryCurrency(next);
    setCurrencyPinned(true);
  }

  /** Al cambiar de cuenta la moneda la sigue, salvo que ya se haya elegido una. */
  function onAccountChange(nextId: string) {
    setAccountId(nextId);
    if (currencyPinned) return;
    const next = accounts.find((a) => a.id === nextId);
    if (next) setEntryCurrency(next.currency);
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
      {/* La moneda en la que se tecleó: el servidor convierte a la de la cuenta. */}
      <input type="hidden" name="currency" value={entryCurrency} />
      <input type="hidden" name="categoryId" value={isDebtKind ? '' : categoryId} />
      <input type="hidden" name="storeId" value={isExpense ? storeId : ''} />
      {/* Deuda que salda el movimiento. Vacío = ninguna, y el servidor deshace el
          abono si el movimiento tenía uno. */}
      <input type="hidden" name="debtId" value={isDebtKind ? debtId : ''} />
      <input type="hidden" name="debtMode" value={debtMode} />
      {/* Solo enviamos tasa cuando es manual; si va vacío, el servidor la busca en
          la fuente elegida para la fecha del movimiento. */}
      <input type="hidden" name="exchangeRate" value={manualRate ?? ''} />
      <input type="hidden" name="rateSource" value={isManualRate ? '' : rateMode} />

      {/* Tipo: decide qué campos tienen sentido debajo. */}
      <Field label={t('fields.kind')} htmlFor="kind">
        <Select id="kind" value={kind} onChange={(e) => changeKind(e.target.value as MovementKind)}>
          {kindOptions.map((k) => (
            <option key={k} value={k}>
              {t(`kinds.${k}`)}
            </option>
          ))}
        </Select>
      </Field>

      {/* 1. Monto */}
      <AmountInput
        value={amountText}
        currency={entryCurrency}
        accountCurrency={accountCurrency}
        rate={effectiveRate}
        rateName={rateName}
        rateDate={rateLabelDate}
        onValueChange={setAmountText}
        onCurrencyChange={onCurrencyChange}
      />
      {err('amount') && <p className="text-caption text-ladrillo">{err('amount')}</p>}

      {/* Fuente de la tasa. Aparece en cuanto hay bolívares de algún lado: es la
          que convierte el monto a la moneda de la cuenta y la que queda congelada.
          Entre dólares no hay nada que elegir, el servidor guarda 1. */}
      {needsRate && (
        <Field
          label={t('fields.rate')}
          htmlFor={isManualRate ? 'rate' : undefined}
          hint={t('rateHint')}
        >
          <div className="space-y-2">
            <Segmented
              value={rateMode}
              onChange={(mode) => {
                if (mode === 'manual') {
                  // Arranca con la tasa que ya se estaba mostrando: se corrige
                  // encima en vez de escribirla desde cero.
                  setIsManualRate(true);
                  if (!rateText.trim() && autoPoint) {
                    setRateText(String(autoPoint.rate).replace('.', ','));
                  }
                  return;
                }
                // Al volver a una fuente, la tasa escrita a mano deja de aplicar.
                setIsManualRate(false);
                setRateSource(mode);
                setRateText('');
              }}
              ariaLabel={t('fields.rate')}
              options={[
                { value: 'official', label: t('rateSources.official') },
                { value: 'parallel', label: t('rateSources.parallel') },
                { value: 'manual', label: t('rateSources.manual') },
              ]}
            />
            {isManualRate && (
              <Input
                id="rate"
                inputMode="decimal"
                value={rateText}
                onChange={(e) => setRateText(e.target.value)}
                placeholder={autoPoint ? formatRate(autoPoint.rate) : ''}
                autoFocus
              />
            )}
          </div>
        </Field>
      )}

      {!isDebtKind && (
        <>
          {/* 2. Categoría (+ productos de esa categoría) */}
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

          {/* 3. Tienda: solo en gastos, y solo si hay tiendas registradas. */}
          {isExpense && stores.length > 0 && (
            <Field label={t('fields.store')} htmlFor="store" hint={t('storeHint')}>
              <Select id="store" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
                <option value="">{t('noStore')}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </>
      )}

      {/* 4. Deuda. En un movimiento de deuda es el campo central: sustituye a la
          categoría y a la descripción, que aquí no aportan nada. */}
      {isDebtKind && (
        <Field label={t('fields.debt')} htmlFor="debt" hint={debt ? undefined : t('debtHint')}>
          <div className="space-y-2">
            <Select id="debt" value={debtId} onChange={(e) => applyDebt(e.target.value, debtMode)}>
              <option value="">{t('pickDebt')}</option>
              {debtOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.counterparty} · {formatMoney(d.remaining, d.currency)}
                </option>
              ))}
            </Select>
            {debt && (
              <>
                <Segmented
                  value={debtMode}
                  onChange={(mode) => applyDebt(debtId, mode)}
                  ariaLabel={t('fields.debt')}
                  options={[
                    { value: 'partial', label: t('debtModes.partial') },
                    { value: 'settle', label: t('debtModes.settle') },
                  ]}
                />
                <p className="text-caption text-sage">
                  {debtMode === 'settle'
                    ? t('debtSettleHint')
                    : t('debtRemaining', {
                        amount: formatMoney(debt.remaining, debt.currency),
                      })}
                </p>
              </>
            )}
          </div>
        </Field>
      )}

      {/* 5. Cuenta: de dónde sale o a dónde entra el dinero. Siempre. */}
      <Field label={t('fields.account')} htmlFor="account" error={err('accountId')}>
        <Select id="account" value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.currency}
            </option>
          ))}
        </Select>
      </Field>

      {/* 6. Descripción: cierra el bloque, ya con la cuenta elegida. En los
          movimientos de deuda no se pide — la escribe el servidor con el nombre de
          la contraparte, que es todo lo que hay que decir. */}
      {!isDebtKind && (
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
            placeholder={t('descriptionPlaceholder')}
            maxLength={120}
            required
          />
        </Field>
      )}

      {/* 6. Fecha */}
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
            pending || amount <= 0 || (isDebtKind && !debtId) || (needsRate && effectiveRate <= 0)
          }
        >
          {t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
